import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import type { ParentLinkedChild } from "@/lib/parent-children";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";

export type ParentPerformanceStatus = "excellent" | "good" | "needs_support" | "no_data";

export type PeerRankSlice = {
  rank: number | null;
  total: number;
};

export type QuizTrendPoint = {
  date: string;
  label: string;
  scorePct: number;
};

export type ParentPerformanceReport = {
  studentUserId: string;
  arabicName: string;
  englishName: string;
  profilePhotoPath: string | null;
  gradeSlug: string;
  gradeLabelEn: string;
  gradeLabelAr: string;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
  averageQuizScorePct: number | null;
  certificatesEarned: number;
  completedLessons: number;
  totalLessons: number;
  totalQuizSubmissions: number;
  rankings: {
    grade: PeerRankSlice;
    section: PeerRankSlice;
    islamicGroup: PeerRankSlice;
  };
  quizTrend: QuizTrendPoint[];
  status: ParentPerformanceStatus;
};

type RankingsRpcPayload = {
  grade?: { rank?: number | null; total?: number | null };
  section?: { rank?: number | null; total?: number | null };
  islamic_group?: { rank?: number | null; total?: number | null };
};

function resolvePerformanceStatus(average: number | null): ParentPerformanceStatus {
  if (average === null) return "no_data";
  if (average >= 90) return "excellent";
  if (average >= 75) return "good";
  return "needs_support";
}

function parseRankSlice(value: { rank?: number | null; total?: number | null } | undefined): PeerRankSlice {
  return {
    rank: typeof value?.rank === "number" ? value.rank : null,
    total: typeof value?.total === "number" ? value.total : 0,
  };
}

async function fetchPeerRankings(studentUserId: string): Promise<ParentPerformanceReport["rankings"]> {
  const empty = {
    grade: { rank: null, total: 0 },
    section: { rank: null, total: 0 },
    islamicGroup: { rank: null, total: 0 },
  };

  const { data, error } = await supabase.rpc("get_student_peer_rankings", {
    p_student_user_id: studentUserId,
  });

  if (error) {
    console.warn("[parent performance rankings]", error.message);
    return empty;
  }

  const payload = (data ?? {}) as RankingsRpcPayload;
  return {
    grade: parseRankSlice(payload.grade),
    section: parseRankSlice(payload.section),
    islamicGroup: parseRankSlice(payload.islamic_group),
  };
}

function formatTrendLabel(iso: string, lang: "en" | "ar"): string {
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

async function fetchQuizTrend(
  studentUserId: string,
  lang: "en" | "ar",
): Promise<{ trend: QuizTrendPoint[]; submissionCount: number }> {
  const { data, error } = await supabase
    .from("lesson_quiz_submissions")
    .select("percentage, submitted_at")
    .eq("student_id", studentUserId)
    .order("submitted_at", { ascending: true });

  if (error) {
    console.warn("[parent performance trend]", error.message);
    return { trend: [], submissionCount: 0 };
  }

  const rows = data ?? [];
  return {
    submissionCount: rows.length,
    trend: rows.map((row, index) => {
      const date = String(row.submitted_at ?? "");
      return {
        date,
        label: date ? formatTrendLabel(date, lang) : `#${index + 1}`,
        scorePct: Number(row.percentage ?? 0),
      };
    }),
  };
}

export async function fetchParentPerformanceReport(
  child: ParentLinkedChild,
  lang: "en" | "ar" = "en",
  progressOverride?: StudentProgressData | null,
): Promise<{ data: ParentPerformanceReport | null; error: string | null }> {
  const progressResult = progressOverride
    ? { data: progressOverride, error: null }
    : await fetchStudentProgress(child.studentUserId);

  if (progressResult.error) {
    return { data: null, error: progressResult.error };
  }
  if (!progressResult.data) {
    return { data: null, error: "Progress data unavailable." };
  }

  const progress = progressResult.data;
  const [{ trend, submissionCount }, rankings] = await Promise.all([
    fetchQuizTrend(child.studentUserId, lang),
    fetchPeerRankings(child.studentUserId),
  ]);

  return {
    data: {
      studentUserId: child.studentUserId,
      arabicName: child.studentName.ar,
      englishName: child.studentName.en,
      profilePhotoPath: child.profilePhotoPath,
      gradeSlug: child.gradeSlug,
      gradeLabelEn: gradeDisplayName(child.gradeSlug, "en") || child.gradeSlug,
      gradeLabelAr: gradeDisplayName(child.gradeSlug, "ar") || child.gradeSlug,
      section: child.section,
      islamicGroup: child.islamicGroup,
      averageQuizScorePct: progress.averageQuizScorePct,
      certificatesEarned: progress.certificatesEarned,
      completedLessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      totalQuizSubmissions: submissionCount,
      rankings,
      quizTrend: trend,
      status: resolvePerformanceStatus(progress.averageQuizScorePct),
    },
    error: null,
  };
}

export function performanceStatusLabel(
  status: ParentPerformanceStatus,
  lang: "en" | "ar",
): { primary: string; secondary: string } {
  const labels = {
    excellent: {
      primary: "ممتاز",
      secondary: "Excellent",
    },
    good: {
      primary: "جيد",
      secondary: "Good",
    },
    needs_support: {
      primary: "يحتاج دعمًا",
      secondary: "Needs support",
    },
    no_data: {
      primary: "لا توجد بيانات بعد",
      secondary: "No data yet",
    },
  }[status];

  return lang === "ar"
    ? { primary: labels.primary, secondary: labels.secondary }
    : { primary: labels.secondary, secondary: labels.primary };
}

export function formatPeerRank(rank: PeerRankSlice, lang: "en" | "ar"): string {
  if (rank.total <= 0) return "—";
  if (rank.rank === null) {
    return lang === "ar" ? `— من ${rank.total}` : `— of ${rank.total}`;
  }
  return lang === "ar" ? `${rank.rank} من ${rank.total}` : `${rank.rank} of ${rank.total}`;
}
