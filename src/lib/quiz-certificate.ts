import type { Bi, QuizQuestion } from "@/lib/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { gradeLabelForPercentage, type SavedQuizSubmission } from "@/lib/lesson-quiz";

export type QuizCertificateRecord = {
  id: string;
  certificate_id: string;
  student_id: string;
  lesson_id: string;
  submission_id: string;
  score: number;
  percentage: number;
  issued_at: string;
};

export function canIssueQuizCertificate(
  submission: SavedQuizSubmission,
  questions: QuizQuestion[],
): boolean {
  const hasEssay = questions.some((q) => q.type === "essay");
  if (submission.status === "reviewed") return true;
  if (!hasEssay) return true;
  return false;
}

export function generateCertificateId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IIA-${date}-${rand}`;
}

function rowToCertificate(row: Record<string, unknown>): QuizCertificateRecord {
  return {
    id: String(row.id),
    certificate_id: String(row.certificate_id),
    student_id: String(row.student_id),
    lesson_id: String(row.lesson_id),
    submission_id: String(row.submission_id),
    score: Number(row.score ?? 0),
    percentage: Number(row.percentage ?? 0),
    issued_at: String(row.issued_at ?? ""),
  };
}

export async function getOrCreateQuizCertificate(
  submission: SavedQuizSubmission,
): Promise<QuizCertificateRecord> {
  const { data: existing, error: findError } = await supabase
    .from("quiz_certificates")
    .select("*")
    .eq("submission_id", submission.id)
    .maybeSingle();

  if (findError) {
    console.error("[quiz certificate find]", findError);
    throw findError;
  }

  if (existing) {
    return rowToCertificate(existing as Record<string, unknown>);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) throw new Error("Not signed in");

  const finalScore =
    submission.final_score ?? submission.auto_score + submission.essay_score;

  const { data, error } = await supabase
    .from("quiz_certificates")
    .insert({
      certificate_id: generateCertificateId(),
      student_id: uid,
      lesson_id: submission.lesson_id,
      submission_id: submission.id,
      score: finalScore,
      percentage: submission.percentage,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[quiz certificate insert]", error);
    throw error;
  }

  return rowToCertificate(data as Record<string, unknown>);
}

export type CertificateStudentNames = {
  /** English / display name shown on certificate (never the raw email). */
  studentName: string;
  studentNameAr: string;
};

function metaString(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

export const CERTIFICATE_NAME_FALLBACK_EN = "Student Name";
export const CERTIFICATE_NAME_FALLBACK_AR = "اسم الطالب";

export type CertificateNameProfile = {
  full_name?: string | null;
  arabic_name?: string | null;
  english_name?: string | null;
};

/** Resolve certificate names — never uses email or email prefix. */
export function resolveCertificateStudentNames(
  user: { user_metadata?: Record<string, unknown> | null },
  profile?: CertificateNameProfile | null,
): CertificateStudentNames {
  const meta = user.user_metadata ?? {};

  const fullName = metaString(meta, "full_name") || profile?.full_name?.trim() || "";
  const englishName = metaString(meta, "english_name") || profile?.english_name?.trim() || "";
  const arabicName =
    metaString(meta, "arabic_name") ||
    profile?.arabic_name?.trim() ||
    metaString(meta, "student_ar_name") ||
    "";

  const studentName = englishName || fullName || CERTIFICATE_NAME_FALLBACK_EN;
  const studentNameAr = arabicName || fullName || CERTIFICATE_NAME_FALLBACK_AR;

  return { studentName, studentNameAr };
}

export type QuizCertificateDisplayData = {
  certificateId: string;
  studentName: string;
  studentNameAr: string;
  gradeName: Bi;
  lessonTitle: Bi;
  finalScore: number;
  totalPoints: number;
  percentage: number;
  gradeLabelEn: string;
  gradeLabelAr: string;
  completionDate: string;
  /** PNG data URL for QR encoding the certificate ID (PDF-safe). */
  qrDataUrl: string;
};

export function buildCertificateDisplayData(
  submission: SavedQuizSubmission,
  certificate: QuizCertificateRecord,
  studentNames: CertificateStudentNames,
  gradeName: Bi,
  lessonTitle: Bi,
): QuizCertificateDisplayData {
  const finalScore =
    submission.final_score ?? submission.auto_score + submission.essay_score;
  const percentage = submission.percentage ?? certificate.percentage;
  const issued = certificate.issued_at || submission.submitted_at;

  return {
    certificateId: certificate.certificate_id,
    studentName: studentNames.studentName,
    studentNameAr: studentNames.studentNameAr,
    gradeName,
    lessonTitle,
    finalScore,
    totalPoints: submission.total_points,
    percentage,
    gradeLabelEn: gradeLabelForPercentage(percentage, "en"),
    gradeLabelAr: gradeLabelForPercentage(percentage, "ar"),
    completionDate: new Date(issued).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
