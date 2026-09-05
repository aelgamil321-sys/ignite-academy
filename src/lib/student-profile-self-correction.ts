import { supabase } from "@/integrations/supabase/client";
import { classifySignupError } from "@/lib/auth-redirect";
import { grades } from "@/lib/curriculum";
import { normalizeGradeSlug } from "@/lib/grade-utils";

export const STUDENT_GRADE_SLUGS = grades.map((g) => g.slug);

export function normalizeStudentEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidStudentEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type StudentEmailChangeValidation =
  | { ok: true; normalizedNew: string }
  | { ok: false; errorKey: StudentEmailChangeErrorKey };

export type StudentEmailChangeErrorKey =
  | "empty"
  | "invalid_email"
  | "same_email"
  | "mismatch"
  | "duplicate_email"
  | "rate_limit"
  | "network"
  | "generic";

export function validateStudentEmailChangeInput(
  currentEmail: string,
  newEmail: string,
  confirmEmail: string,
): StudentEmailChangeValidation {
  const normalizedCurrent = normalizeStudentEmailInput(currentEmail);
  const normalizedNew = normalizeStudentEmailInput(newEmail);
  const normalizedConfirm = normalizeStudentEmailInput(confirmEmail);

  if (!normalizedNew) return { ok: false, errorKey: "empty" };
  if (!isValidStudentEmailFormat(normalizedNew)) return { ok: false, errorKey: "invalid_email" };
  if (normalizedNew === normalizedCurrent) return { ok: false, errorKey: "same_email" };
  if (normalizedNew !== normalizedConfirm) return { ok: false, errorKey: "mismatch" };
  return { ok: true, normalizedNew };
}

export function mapAuthEmailChangeError(err: unknown): StudentEmailChangeErrorKey {
  switch (classifySignupError(err)) {
    case "duplicate_email":
      return "duplicate_email";
    case "rate_limit":
      return "rate_limit";
    case "invalid_email":
      return "invalid_email";
    case "network":
      return "network";
    default:
      return "generic";
  }
}

export type StudentGradeChangeValidation =
  | { ok: true; normalizedGrade: string }
  | { ok: false; errorKey: "empty" | "invalid_grade" | "same_grade" };

export function isValidStudentGradeSlug(value: string): boolean {
  const slug = normalizeGradeSlug(value);
  return Boolean(slug && STUDENT_GRADE_SLUGS.includes(slug));
}

export function validateStudentGradeChangeInput(
  currentGrade: string,
  newGrade: string,
): StudentGradeChangeValidation {
  const normalizedGrade = normalizeGradeSlug(newGrade);
  if (!normalizedGrade) return { ok: false, errorKey: "empty" };
  if (!STUDENT_GRADE_SLUGS.includes(normalizedGrade)) return { ok: false, errorKey: "invalid_grade" };
  if (normalizeGradeSlug(currentGrade) === normalizedGrade) return { ok: false, errorKey: "same_grade" };
  return { ok: true, normalizedGrade };
}

export async function changeStudentLoginEmail(input: {
  userId: string;
  currentEmail: string;
  newEmail: string;
  confirmEmail: string;
}): Promise<
  | { ok: true; email: string }
  | { ok: false; errorKey: StudentEmailChangeErrorKey }
> {
  const validated = validateStudentEmailChangeInput(input.currentEmail, input.newEmail, input.confirmEmail);
  if (!validated.ok) return validated;

  const { data: authData, error: authError } = await supabase.auth.updateUser({
    email: validated.normalizedNew,
  });

  if (authError) {
    console.error("[student email change auth]", authError);
    return { ok: false, errorKey: mapAuthEmailChangeError(authError) };
  }

  const confirmedEmail = normalizeStudentEmailInput(authData.user?.email ?? validated.normalizedNew);
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      email: confirmedEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);

  if (profileError) {
    console.error("[student email change profile sync]", profileError);
    return { ok: false, errorKey: "generic" };
  }

  return { ok: true, email: confirmedEmail };
}

export async function changeStudentGrade(input: {
  userId: string;
  currentGrade: string;
  newGrade: string;
}): Promise<
  | { ok: true; grade: string }
  | { ok: false; errorKey: StudentGradeChangeValidation extends { ok: false; errorKey: infer K } ? K : never }
> {
  const validated = validateStudentGradeChangeInput(input.currentGrade, input.newGrade);
  if (!validated.ok) return validated;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      grade: validated.normalizedGrade,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .select("grade, section, islamic_group, parent_link_code, user_id")
    .single();

  if (error || !data) {
    console.error("[student grade change]", error);
    return { ok: false, errorKey: "invalid_grade" };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { grade: validated.normalizedGrade },
  });
  if (metaError) {
    console.warn("[student grade metadata sync]", metaError);
  }

  return { ok: true, grade: data.grade ?? validated.normalizedGrade };
}
