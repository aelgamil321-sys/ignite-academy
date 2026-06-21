import type { ParentDashboardData } from "@/lib/parent-dashboard";

/** Dev-only mock for /parent/dashboard?uiPreview=1 visual verification. */
export const PARENT_DASHBOARD_UI_PREVIEW: ParentDashboardData = {
  studentUserId: "preview-student",
  studentName: { en: "Ahmed Hassan", ar: "أحمد حسن" },
  gradeSlug: "8",
  section: "A",
  islamicGroup: "A",
  profilePhotoPath: null,
  progress: {
    gradeSlug: "8",
    totalLessons: 12,
    completedLessons: 9,
    overallProgressPct: 75,
    certificatesEarned: 3,
    averageQuizScorePct: 92,
    learningLevelEn: "Excellent",
    learningLevelAr: "ممتاز",
    certificates: [
      {
        certificateId: "CERT-001",
        lessonId: "lesson-1",
        lessonTitle: { en: "Introduction to Fiqh", ar: "مقدمة في الفقه" },
        score: 92,
        percentage: 92,
        issuedAt: new Date().toISOString(),
      },
    ],
    recentAchievements: [],
    activityTimeline: [],
  },
  performanceReport: {
    studentUserId: "preview-student",
    arabicName: "أحمد حسن",
    englishName: "Ahmed Hassan",
    profilePhotoPath: null,
    gradeSlug: "8",
    gradeLabelEn: "Grade 8",
    gradeLabelAr: "الصف الثامن",
    section: "A",
    islamicGroup: "A",
    averageQuizScorePct: 92,
    certificatesEarned: 3,
    completedLessons: 9,
    totalLessons: 12,
    totalQuizSubmissions: 8,
    rankings: {
      grade: { rank: 3, total: 24 },
      section: { rank: 1, total: 8 },
      islamicGroup: { rank: 1, total: 12 },
    },
    quizTrend: [
      { date: "2026-05-01", label: "May 1", scorePct: 88 },
      { date: "2026-06-01", label: "Jun 1", scorePct: 92 },
    ],
    status: "excellent",
  },
};
