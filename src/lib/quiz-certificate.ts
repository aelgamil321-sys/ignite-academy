import type { Bi, QuizQuestion } from "@/lib/curriculum";
import { grades } from "@/lib/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import {
  gradeLabelForPercentage,
  submissionRowToSaved,
  type SavedQuizSubmission,
} from "@/lib/lesson-quiz";
import { fetchStudentProfile } from "@/lib/student-profile";

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

/** Platform-wide alias — quiz completion is the current issuance source. */
export const canIssueCertificate = canIssueQuizCertificate;

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

function parseLessonTitle(raw: unknown): Bi {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return { en: String(o.en ?? ""), ar: String(o.ar ?? "") };
  }
  return { en: "", ar: "" };
}

/** Read-only fetch — RLS limits parents to linked children. */
export async function fetchQuizCertificateRecord(
  certificateId: string,
  studentUserId: string,
): Promise<QuizCertificateRecord | null> {
  const { data, error } = await supabase
    .from("quiz_certificates")
    .select("*")
    .eq("certificate_id", certificateId)
    .eq("student_id", studentUserId)
    .maybeSingle();

  if (error) {
    console.error("[quiz certificate fetch]", error);
    throw error;
  }

  return data ? rowToCertificate(data as Record<string, unknown>) : null;
}

export type LinkedChildCertificatePreview = {
  submission: SavedQuizSubmission;
  certificate: QuizCertificateRecord;
  gradeName: Bi;
  lessonTitle: Bi;
  studentNames: CertificateStudentNames;
};

/** Load certificate preview data for a parent viewing a linked child's certificate. */
export async function loadLinkedChildCertificatePreview(
  certificateId: string,
  studentUserId: string,
): Promise<LinkedChildCertificatePreview> {
  const certificate = await fetchQuizCertificateRecord(certificateId, studentUserId);
  if (!certificate) {
    throw new Error("certificate_not_found");
  }

  const { data: submissionRow, error: submissionError } = await supabase
    .from("lesson_quiz_submissions")
    .select("*")
    .eq("id", certificate.submission_id)
    .eq("student_id", studentUserId)
    .maybeSingle();

  if (submissionError) {
    console.error("[quiz certificate submission fetch]", submissionError);
    throw submissionError;
  }
  if (!submissionRow) {
    throw new Error("submission_not_found");
  }

  const submission = submissionRowToSaved(submissionRow as Record<string, unknown>);
  const profile = await fetchStudentProfile(studentUserId);
  const studentNames = resolveCertificateStudentNames(profile);

  const gradeSlug = normalizeGradeSlug(profile?.grade ?? "") || "8";
  const grade = grades.find((g) => g.slug === gradeSlug);
  const gradeName = grade?.name ?? { en: "Grade", ar: "صف" };

  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .select("title")
    .eq("id", certificate.lesson_id)
    .maybeSingle();

  if (lessonError) {
    console.error("[quiz certificate lesson fetch]", lessonError);
    throw lessonError;
  }

  const lessonTitle = parseLessonTitle(lessonRow?.title);

  return {
    submission,
    certificate,
    gradeName,
    lessonTitle,
    studentNames,
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

export const CERTIFICATE_NAME_FALLBACK_EN = "Student Name";
export const CERTIFICATE_NAME_FALLBACK_AR = "اسم الطالب";

export type CertificateNameProfile = {
  full_name?: string | null;
  arabic_name?: string | null;
  english_name?: string | null;
};

/** Resolve certificate names from the student profile only — never email or auth metadata. */
export function resolveCertificateStudentNames(
  profile: CertificateNameProfile | null | undefined,
): CertificateStudentNames {
  const englishName = profile?.english_name?.trim() || "";
  const arabicName = profile?.arabic_name?.trim() || "";
  const fullName = profile?.full_name?.trim() || "";

  const studentName = englishName || fullName || CERTIFICATE_NAME_FALLBACK_EN;

  let studentNameAr: string;
  if (arabicName) {
    studentNameAr = arabicName;
  } else if (fullName) {
    studentNameAr = fullName;
  } else {
    studentNameAr = CERTIFICATE_NAME_FALLBACK_AR;
  }

  if (!arabicName && englishName && studentNameAr === studentName) {
    studentNameAr = CERTIFICATE_NAME_FALLBACK_AR;
  }

  return { studentName, studentNameAr };
}

/** Display payload for the platform certificate template (all completion types). */
export type CertificateDisplayData = {
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
  qrDataUrl?: string;
};

/** @deprecated Use CertificateDisplayData */
export type QuizCertificateDisplayData = CertificateDisplayData;

export function buildCertificateDisplayData(
  submission: SavedQuizSubmission,
  certificate: QuizCertificateRecord,
  studentNames: CertificateStudentNames,
  gradeName: Bi,
  lessonTitle: Bi,
): CertificateDisplayData {
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
