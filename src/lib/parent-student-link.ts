import { normalizeGradeSlug } from "@/lib/grade-utils";

type StudentProfileRow = {
  user_id: string;
  full_name: string;
  arabic_name: string;
  english_name: string;
  grade: string;
};

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function studentProfileMatchesName(
  profile: Pick<StudentProfileRow, "full_name" | "arabic_name" | "english_name">,
  studentName: string,
): boolean {
  const target = normalizePersonName(studentName);
  if (!target) return false;
  const candidates = [profile.full_name, profile.english_name, profile.arabic_name]
    .map((value) => normalizePersonName(value ?? ""))
    .filter(Boolean);
  return candidates.includes(target);
}

export function filterMatchingStudentProfiles<T extends StudentProfileRow>(
  profiles: T[],
  studentName: string,
  studentGrade: string,
): T[] {
  const gradeSlug = normalizeGradeSlug(studentGrade) || studentGrade;
  return profiles.filter(
    (profile) =>
      normalizeGradeSlug(profile.grade) === gradeSlug &&
      studentProfileMatchesName(profile, studentName),
  );
}

export type ParentStudentLinkResult =
  | { status: "linked"; studentUserId: string; profile: StudentProfileRow }
  | { status: "none" }
  | { status: "multiple"; count: number };

export function resolveParentStudentLink(
  profiles: StudentProfileRow[],
  studentName: string,
  studentGrade: string,
): ParentStudentLinkResult {
  const matches = filterMatchingStudentProfiles(profiles, studentName, studentGrade);
  if (matches.length === 0) return { status: "none" };
  if (matches.length > 1) return { status: "multiple", count: matches.length };
  return { status: "linked", studentUserId: matches[0].user_id, profile: matches[0] };
}
