import type { Bi } from "@/lib/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { resolveParentStudentLink } from "@/lib/parent-student-link";

export type ParentLinkedChild = {
  studentUserId: string;
  studentName: Bi;
  gradeSlug: string;
};

export type ParentChildrenLinkError = "none" | "multiple";

export type ParentChildrenResult = {
  children: ParentLinkedChild[];
  error: string | null;
  linkError: ParentChildrenLinkError | null;
  usesExplicitLinks: boolean;
};

type StudentProfileRow = {
  user_id: string;
  full_name: string;
  arabic_name: string;
  english_name: string;
  grade: string;
};

function profileToLinkedChild(profile: StudentProfileRow, fallbackName = ""): ParentLinkedChild {
  const fullName = profile.full_name?.trim() || fallbackName.trim() || "Student";
  const gradeSlug = normalizeGradeSlug(profile.grade) || profile.grade;
  return {
    studentUserId: profile.user_id,
    studentName: {
      en: profile.english_name?.trim() || fullName,
      ar: profile.arabic_name?.trim() || fullName,
    },
    gradeSlug,
  };
}

export async function fetchParentLinkedChildren(parentUserId: string): Promise<ParentChildrenResult> {
  const { data: links, error: linksError } = await supabase
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id", parentUserId)
    .order("created_at", { ascending: true });

  if (linksError) {
    return { children: [], error: linksError.message, linkError: null, usesExplicitLinks: false };
  }

  if ((links ?? []).length > 0) {
    const studentIds = links.map((link) => link.student_user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, arabic_name, english_name, grade")
      .in("user_id", studentIds);

    if (profilesError) {
      return { children: [], error: profilesError.message, linkError: null, usesExplicitLinks: true };
    }

    const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    const children = studentIds
      .map((studentUserId) => profileById.get(studentUserId))
      .filter((profile): profile is StudentProfileRow => Boolean(profile))
      .map((profile) => profileToLinkedChild(profile));

    return {
      children,
      error: null,
      linkError: children.length === 0 ? "none" : null,
      usesExplicitLinks: true,
    };
  }

  const { data: parentProfile, error: parentProfileError } = await supabase
    .from("parent_profiles")
    .select("student_name, student_grade")
    .eq("user_id", parentUserId)
    .maybeSingle();

  if (parentProfileError) {
    return { children: [], error: parentProfileError.message, linkError: null, usesExplicitLinks: false };
  }
  if (!parentProfile) {
    return {
      children: [],
      error: "Parent profile not found.",
      linkError: null,
      usesExplicitLinks: false,
    };
  }

  const studentGrade = normalizeGradeSlug(parentProfile.student_grade) || parentProfile.student_grade;
  const { data: studentProfiles, error: studentsError } = await supabase
    .from("profiles")
    .select("user_id, full_name, arabic_name, english_name, grade")
    .eq("grade", studentGrade);

  if (studentsError) {
    return { children: [], error: studentsError.message, linkError: null, usesExplicitLinks: false };
  }

  const link = resolveParentStudentLink(
    studentProfiles ?? [],
    parentProfile.student_name,
    studentGrade,
  );

  if (link.status === "none") {
    return { children: [], error: null, linkError: "none", usesExplicitLinks: false };
  }
  if (link.status === "multiple") {
    return { children: [], error: null, linkError: "multiple", usesExplicitLinks: false };
  }

  return {
    children: [profileToLinkedChild(link.profile, parentProfile.student_name)],
    error: null,
    linkError: null,
    usesExplicitLinks: false,
  };
}

export function parentSelectedChildStorageKey(parentUserId: string): string {
  return `parent-selected-child-${parentUserId}`;
}

export function readStoredParentChildId(parentUserId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(parentSelectedChildStorageKey(parentUserId));
  } catch {
    return null;
  }
}

export function storeParentChildId(parentUserId: string, studentUserId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(parentSelectedChildStorageKey(parentUserId), studentUserId);
  } catch {
    // ignore storage failures
  }
}

export function resolveSelectedChild(
  children: ParentLinkedChild[],
  parentUserId: string,
  preferredStudentUserId?: string | null,
): ParentLinkedChild | null {
  if (children.length === 0) return null;
  const storedId = preferredStudentUserId ?? readStoredParentChildId(parentUserId);
  if (storedId) {
    const match = children.find((child) => child.studentUserId === storedId);
    if (match) return match;
  }
  return children[0];
}
