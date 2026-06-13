import type { Bi } from "@/lib/curriculum";
import type { StudentProgressData } from "@/lib/student-progress";

export type StudentBadgeId =
  | "first_certificate"
  | "excellent_student"
  | "lesson_explorer"
  | "quiz_master"
  | "rising_star"
  | "academy_graduate";

export type StudentBadge = {
  id: StudentBadgeId;
  icon: string;
  title: Bi;
  description: Bi;
  unlocked: boolean;
};

const BADGE_DEFS: Array<{
  id: StudentBadgeId;
  icon: string;
  title: Bi;
  description: Bi;
  isUnlocked: (p: StudentProgressData) => boolean;
}> = [
  {
    id: "first_certificate",
    icon: "🏆",
    title: { en: "First Certificate", ar: "أول شهادة" },
    description: {
      en: "Earn your first lesson completion certificate.",
      ar: "احصل على أول شهادة إتمام درس.",
    },
    isUnlocked: (p) => p.certificatesEarned >= 1,
  },
  {
    id: "excellent_student",
    icon: "🥇",
    title: { en: "Excellent Student", ar: "طالب متميز" },
    description: {
      en: "Maintain an average quiz score of 90% or higher.",
      ar: "حافظ على متوسط درجات اختبار 90٪ أو أعلى.",
    },
    isUnlocked: (p) => p.averageQuizScorePct !== null && p.averageQuizScorePct >= 90,
  },
  {
    id: "lesson_explorer",
    icon: "📚",
    title: { en: "Lesson Explorer", ar: "مستكشف الدروس" },
    description: {
      en: "Complete quizzes for at least 5 lessons.",
      ar: "أكمل اختبارات لـ 5 دروس على الأقل.",
    },
    isUnlocked: (p) => p.completedLessons >= 5,
  },
  {
    id: "quiz_master",
    icon: "⭐",
    title: { en: "Quiz Master", ar: "بطل الاختبارات" },
    description: {
      en: "Complete 10 lessons with an average quiz score of 85% or higher.",
      ar: "أكمل 10 دروسًا بمتوسط درجات 85٪ أو أعلى.",
    },
    isUnlocked: (p) =>
      p.completedLessons >= 10 &&
      p.averageQuizScorePct !== null &&
      p.averageQuizScorePct >= 85,
  },
  {
    id: "rising_star",
    icon: "🚀",
    title: { en: "Rising Star", ar: "نجم صاعد" },
    description: {
      en: "Reach 50% overall lesson progress in your grade.",
      ar: "حقّق 50٪ من التقدّم الإجمالي في صفّك.",
    },
    isUnlocked: (p) => p.overallProgressPct >= 50,
  },
  {
    id: "academy_graduate",
    icon: "🎓",
    title: { en: "Academy Graduate", ar: "خريج الأكاديمية" },
    description: {
      en: "Complete every published lesson quiz in your grade.",
      ar: "أكمل اختبارات جميع الدروس المنشورة في صفّك.",
    },
    isUnlocked: (p) => p.overallProgressPct >= 100,
  },
];

export function computeStudentBadges(progress: StudentProgressData): {
  badges: StudentBadge[];
  unlockedCount: number;
  totalCount: number;
} {
  const badges = BADGE_DEFS.map((def) => ({
    id: def.id,
    icon: def.icon,
    title: def.title,
    description: def.description,
    unlocked: def.isUnlocked(progress),
  }));
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  return { badges, unlockedCount, totalCount: badges.length };
}
