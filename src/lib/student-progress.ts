import type { Bi } from "@/lib/curriculum";
import { gradeLabelForPercentage } from "@/lib/lesson-quiz";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { supabase } from "@/integrations/supabase/client";

function parseBi(raw: unknown): Bi {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return { en: String(o.en ?? ""), ar: String(o.ar ?? "") };
  }
  return { en: "", ar: "" };
}

export type StudentCertificateRow = {
  certificateId: string;
  lessonId: string;
  lessonTitle: Bi;
  score: number;
  percentage: number;
  issuedAt: string;
};

export type StudentAchievement =
  | {
      kind: "certificate";
      at: string;
      lessonId: string;
      lessonTitle: Bi;
      scorePct: number;
      certificateId: string;
    }
  | {
      kind: "quiz_submit";
      at: string;
      lessonId: string;
      lessonTitle: Bi;
      scorePct: number;
      submissionId: string;
    };

export type StudentProgressData = {
  gradeSlug: string;
  totalLessons: number;
  completedLessons: number;
  overallProgressPct: number;
  certificatesEarned: number;
  averageQuizScorePct: number | null;
  learningLevelEn: string;
  learningLevelAr: string;
  certificates: StudentCertificateRow[];
  recentAchievements: StudentAchievement[];
};

export async function fetchStudentProgress(userId: string): Promise<{
  data: StudentProgressData | null;
  error: string | null;
}> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("grade")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const gradeSlug = normalizeGradeSlug(profile?.grade ?? "") || "8";

  const [lessonsRes, submissionsRes, certificatesRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title", { count: "exact" })
      .eq("published", true)
      .eq("grade", gradeSlug),
    supabase
      .from("lesson_quiz_submissions")
      .select("id, lesson_id, percentage, status, submitted_at")
      .eq("student_id", userId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("quiz_certificates")
      .select("certificate_id, lesson_id, score, percentage, issued_at, submission_id")
      .eq("student_id", userId)
      .order("issued_at", { ascending: false }),
  ]);

  if (lessonsRes.error) return { data: null, error: lessonsRes.error.message };
  if (submissionsRes.error) return { data: null, error: submissionsRes.error.message };
  if (certificatesRes.error) return { data: null, error: certificatesRes.error.message };

  const lessonTitleMap = new Map<string, Bi>();
  for (const row of lessonsRes.data ?? []) {
    lessonTitleMap.set(String(row.id), parseBi(row.title));
  }

  const submissions = submissionsRes.data ?? [];
  const certificates = certificatesRes.data ?? [];

  const extraLessonIds = [
    ...new Set([
      ...submissions.map((s) => String(s.lesson_id)),
      ...certificates.map((c) => String(c.lesson_id)),
    ]),
  ].filter((id) => !lessonTitleMap.has(id));

  if (extraLessonIds.length > 0) {
    const { data: extraLessons } = await supabase
      .from("lessons")
      .select("id, title")
      .in("id", extraLessonIds);
    for (const row of extraLessons ?? []) {
      lessonTitleMap.set(String(row.id), parseBi(row.title));
    }
  }

  const completedLessonIds = new Set(submissions.map((s) => String(s.lesson_id)));
  const totalLessons = lessonsRes.count ?? (lessonsRes.data?.length ?? 0);
  const completedLessons = completedLessonIds.size;
  const overallProgressPct =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 1000) / 10 : 0;

  const reviewed = submissions.filter((s) => s.status !== "pending_review");
  const averageQuizScorePct =
    reviewed.length > 0
      ? Math.round(
          (reviewed.reduce((sum, s) => sum + Number(s.percentage ?? 0), 0) / reviewed.length) * 10,
        ) / 10
      : null;

  const learningLevelEn =
    averageQuizScorePct === null
      ? "Not started"
      : gradeLabelForPercentage(averageQuizScorePct, "en");
  const learningLevelAr =
    averageQuizScorePct === null
      ? "لم يبدأ بعد"
      : gradeLabelForPercentage(averageQuizScorePct, "ar");

  const certSubmissionIds = new Set(
    certificates.map((c) => String(c.submission_id ?? "")),
  );

  const certificateRows: StudentCertificateRow[] = certificates.map((c) => ({
    certificateId: String(c.certificate_id),
    lessonId: String(c.lesson_id),
    lessonTitle: lessonTitleMap.get(String(c.lesson_id)) ?? { en: "Lesson", ar: "درس" },
    score: Number(c.score ?? 0),
    percentage: Number(c.percentage ?? 0),
    issuedAt: String(c.issued_at ?? ""),
  }));

  const achievements: StudentAchievement[] = [
    ...certificateRows.map((c) => ({
      kind: "certificate" as const,
      at: c.issuedAt,
      lessonId: c.lessonId,
      lessonTitle: c.lessonTitle,
      scorePct: c.percentage,
      certificateId: c.certificateId,
    })),
    ...submissions
      .filter((s) => !certSubmissionIds.has(String(s.id)))
      .map((s) => ({
        kind: "quiz_submit" as const,
        at: String(s.submitted_at ?? ""),
        lessonId: String(s.lesson_id),
        lessonTitle: lessonTitleMap.get(String(s.lesson_id)) ?? { en: "Lesson", ar: "درس" },
        scorePct: Number(s.percentage ?? 0),
        submissionId: String(s.id),
      })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    data: {
      gradeSlug,
      totalLessons,
      completedLessons,
      overallProgressPct,
      certificatesEarned: certificates.length,
      averageQuizScorePct,
      learningLevelEn,
      learningLevelAr,
      certificates: certificateRows,
      recentAchievements: achievements.slice(0, 10),
    },
    error: null,
  };
}
