import { useRouterState } from "@tanstack/react-router";

/** Admin shell vs Lead Teacher school-management routes inside Teacher workspace. */
export function useSchoolManagementPaths() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lead = pathname.startsWith("/teacher/lead");
  const base = lead ? "/teacher/lead" : "/admin";

  return {
    lead,
    base,
    overview: `${base}`,
    content: `${base}/content`,
    analytics: `${base}/analytics`,
    students: `${base}/students`,
    studentDetail: (studentId: string) => `${base}/students/${studentId}`,
    teachers: `${base}/teachers`,
    teachersManage: `${base}/teachers/manage`,
    teacherDetail: (teacherId: string) => `${base}/teachers/${teacherId}`,
    parents: `${base}/parents`,
    lessons: `${base}/lessons`,
    assignments: `${base}/assignments`,
    assignmentDetail: (assignmentId: string) => `${base}/assignments/${assignmentId}`,
    quizSubmissions: `${base}/quiz-submissions`,
    honorBoard: `${base}/honor-board`,
    grades: `${base}/grades`,
    gradeDetail: (grade: string) => `${base}/grades/${grade}`,
    weeklyPlanningDashboard: lead
      ? "/teacher/weekly-planning/dashboard"
      : "/admin/weekly-planning/dashboard",
  };
}
