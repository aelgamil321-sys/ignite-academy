import type { Bi } from "@/lib/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { resolveParentStudentLink } from "@/lib/parent-student-link";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";

export type ParentDashboardData = {
  studentName: Bi;
  gradeSlug: string;
  progress: StudentProgressData;
};

export type ParentDashboardLinkError = "none" | "multiple";

export type ParentDashboardResult = {
  data: ParentDashboardData | null;
  error: string | null;
  linkError: ParentDashboardLinkError | null;
};

export async function fetchParentDashboardData(parentUserId: string): Promise<ParentDashboardResult> {
  const { data: parentProfile, error: parentProfileError } = await supabase
    .from("parent_profiles")
    .select("full_name, email, student_name, student_grade")
    .eq("user_id", parentUserId)
    .maybeSingle();

  if (parentProfileError) {
    return { data: null, error: parentProfileError.message, linkError: null };
  }
  if (!parentProfile) {
    return {
      data: null,
      error: "Parent profile not found.",
      linkError: null,
    };
  }

  const studentGrade = normalizeGradeSlug(parentProfile.student_grade) || parentProfile.student_grade;
  const { data: studentProfiles, error: studentsError } = await supabase
    .from("profiles")
    .select("user_id, full_name, arabic_name, english_name, grade")
    .eq("grade", studentGrade);

  if (studentsError) {
    return { data: null, error: studentsError.message, linkError: null };
  }

  const link = resolveParentStudentLink(
    studentProfiles ?? [],
    parentProfile.student_name,
    studentGrade,
  );

  if (link.status === "none") {
    return { data: null, error: null, linkError: "none" };
  }
  if (link.status === "multiple") {
    return { data: null, error: null, linkError: "multiple" };
  }

  const { data: progress, error: progressError } = await fetchStudentProgress(link.studentUserId);
  if (progressError) {
    return { data: null, error: progressError, linkError: null };
  }
  if (!progress) {
    return { data: null, error: "Progress data unavailable.", linkError: null };
  }

  const fullName = link.profile.full_name?.trim() || parentProfile.student_name.trim() || "Student";
  const studentName: Bi = {
    en: link.profile.english_name?.trim() || fullName,
    ar: link.profile.arabic_name?.trim() || fullName,
  };

  return {
    data: {
      studentName,
      gradeSlug: progress.gradeSlug,
      progress,
    },
    error: null,
    linkError: null,
  };
}
