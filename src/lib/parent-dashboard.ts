import type { Bi } from "@/lib/curriculum";
import {
  fetchParentLinkedChildren,
  type ParentChildrenResult,
  type ParentLinkedChild,
} from "@/lib/parent-children";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";
import {
  fetchParentPerformanceReport,
  type ParentPerformanceReport,
} from "@/lib/parent-performance-report";

export type ParentDashboardData = {
  studentUserId: string;
  studentName: Bi;
  gradeSlug: string;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
  profilePhotoPath: string | null;
  progress: StudentProgressData;
  performanceReport: ParentPerformanceReport;
};

export type ParentDashboardLinkError = "none" | "multiple";

export type ParentDashboardResult = {
  data: ParentDashboardData | null;
  error: string | null;
  linkError: ParentDashboardLinkError | null;
};

export type ParentDashboardBundle = ParentChildrenResult & {
  dashboard: ParentDashboardData | null;
  dashboardError: string | null;
};

export async function fetchParentDashboardForStudent(
  studentUserId: string,
  childMeta?: Pick<
    ParentLinkedChild,
    "studentName" | "gradeSlug" | "section" | "islamicGroup" | "profilePhotoPath"
  >,
  options?: { lang?: "en" | "ar" },
): Promise<ParentDashboardResult> {
  const { data: progress, error: progressError } = await fetchStudentProgress(studentUserId);
  if (progressError) {
    return { data: null, error: progressError, linkError: null };
  }
  if (!progress) {
    return { data: null, error: "Progress data unavailable.", linkError: null };
  }

  const studentName = childMeta?.studentName ?? { en: "Student", ar: "Student" };
  const childForReport: ParentLinkedChild = {
    studentUserId,
    studentName,
    gradeSlug: childMeta?.gradeSlug ?? progress.gradeSlug,
    section: childMeta?.section ?? null,
    islamicGroup: childMeta?.islamicGroup ?? null,
    profilePhotoPath: childMeta?.profilePhotoPath ?? null,
  };

  const performanceResult = await fetchParentPerformanceReport(
    childForReport,
    options?.lang ?? "en",
    progress,
  );
  if (performanceResult.error || !performanceResult.data) {
    return {
      data: null,
      error: performanceResult.error ?? "Performance report unavailable.",
      linkError: null,
    };
  }

  return {
    data: {
      studentUserId,
      studentName,
      gradeSlug: childMeta?.gradeSlug ?? progress.gradeSlug,
      section: childMeta?.section ?? null,
      islamicGroup: childMeta?.islamicGroup ?? null,
      profilePhotoPath: childMeta?.profilePhotoPath ?? null,
      progress,
      performanceReport: performanceResult.data,
    },
    error: null,
    linkError: null,
  };
}

/** @deprecated Use fetchParentDashboardBundle for multi-child support. */
export async function fetchParentDashboardData(parentUserId: string): Promise<ParentDashboardResult> {
  const bundle = await fetchParentDashboardBundle(parentUserId);
  if (bundle.linkError) {
    return { data: null, error: null, linkError: bundle.linkError };
  }
  if (bundle.error) {
    return { data: null, error: bundle.error, linkError: null };
  }
  if (bundle.dashboardError) {
    return { data: null, error: bundle.dashboardError, linkError: null };
  }
  return { data: bundle.dashboard, error: null, linkError: null };
}

export async function fetchParentDashboardBundle(
  parentUserId: string,
  selectedStudentUserId?: string | null,
  options?: { lang?: "en" | "ar" },
): Promise<ParentDashboardBundle> {
  const childrenResult = await fetchParentLinkedChildren(parentUserId);
  if (childrenResult.error || childrenResult.linkError || childrenResult.children.length === 0) {
    return {
      ...childrenResult,
      dashboard: null,
      dashboardError: null,
    };
  }

  const selectedChild =
    childrenResult.children.find((child) => child.studentUserId === selectedStudentUserId) ??
    childrenResult.children[0];

  const dashboardResult = await fetchParentDashboardForStudent(
    selectedChild.studentUserId,
    selectedChild,
    options,
  );

  return {
    ...childrenResult,
    dashboard: dashboardResult.data,
    dashboardError: dashboardResult.error,
  };
}

export type { ParentLinkedChild, ParentChildrenResult };
