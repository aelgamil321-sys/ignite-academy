import type { Bi } from "@/lib/curriculum";
import type { StudentProgressData } from "@/lib/student-progress";
import { L } from "@/lib/i18n-config";

function biFromL(pair: Record<"en" | "ar", string>): Bi {
  return { en: pair.en, ar: pair.ar };
}

const BADGE_STRINGS = {
  firstCertTitle: L("First Certificate", "أول شهادة"),
  firstCertDesc: L("Earn your first lesson completion certificate.", "احصل على أول شهادة إتمام درس."),
  excellentTitle: L("Excellent Student", "طالب متميز"),
  excellentDesc: L("Maintain an average quiz score of 90% or higher.", "حافظ على متوسط درجات اختبار 90٪ أو أعلى."),
  explorerTitle: L("Lesson Explorer", "مستكشف الدروس"),
  explorerDesc: L("Complete quizzes for at least 5 lessons.", "أكمل اختبارات لـ 5 دروس على الأقل."),
  masterTitle: L("Quiz Master", "بطل الاختبارات"),
  masterDesc: L(
    "Complete 10 lessons with an average quiz score of 85% or higher.",
    "أكمل 10 دروسًا بمتوسط درجات 85٪ أو أعلى.",
  ),
  risingTitle: L("Rising Star", "نجم صاعد"),
  risingDesc: L("Reach 50% overall lesson progress in your grade.", "حقّق 50٪ من التقدّم الإجمالي في صفّك."),
  graduateTitle: L("Academy Graduate", "خريج الأكاديمية"),
  graduateDesc: L(
    "Complete every published lesson quiz in your grade.",
    "أكمل اختبارات جميع الدروس المنشورة في صفّك.",
  ),
} as const;

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
    title: biFromL(BADGE_STRINGS.firstCertTitle),
    description: biFromL(BADGE_STRINGS.firstCertDesc),
    isUnlocked: (p) => p.certificatesEarned >= 1,
  },
  {
    id: "excellent_student",
    icon: "🥇",
    title: biFromL(BADGE_STRINGS.excellentTitle),
    description: biFromL(BADGE_STRINGS.excellentDesc),
    isUnlocked: (p) => p.averageQuizScorePct !== null && p.averageQuizScorePct >= 90,
  },
  {
    id: "lesson_explorer",
    icon: "📚",
    title: biFromL(BADGE_STRINGS.explorerTitle),
    description: biFromL(BADGE_STRINGS.explorerDesc),
    isUnlocked: (p) => p.completedLessons >= 5,
  },
  {
    id: "quiz_master",
    icon: "⭐",
    title: biFromL(BADGE_STRINGS.masterTitle),
    description: biFromL(BADGE_STRINGS.masterDesc),
    isUnlocked: (p) =>
      p.completedLessons >= 10 &&
      p.averageQuizScorePct !== null &&
      p.averageQuizScorePct >= 85,
  },
  {
    id: "rising_star",
    icon: "🚀",
    title: biFromL(BADGE_STRINGS.risingTitle),
    description: biFromL(BADGE_STRINGS.risingDesc),
    isUnlocked: (p) => p.overallProgressPct >= 50,
  },
  {
    id: "academy_graduate",
    icon: "🎓",
    title: biFromL(BADGE_STRINGS.graduateTitle),
    description: biFromL(BADGE_STRINGS.graduateDesc),
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

export function isStudentBadgeUnlocked(
  badgeId: StudentBadgeId,
  progress: StudentProgressData,
): boolean {
  const def = BADGE_DEFS.find((d) => d.id === badgeId);
  return def ? def.isUnlocked(progress) : false;
}

export function studentBadgeMeta(badgeId: StudentBadgeId): {
  icon: string;
  title: Bi;
  description: Bi;
} | null {
  const def = BADGE_DEFS.find((d) => d.id === badgeId);
  if (!def) return null;
  return { icon: def.icon, title: def.title, description: def.description };
}

export function evaluateStudentBadges(progress: StudentProgressData): StudentBadgeId[] {
  return BADGE_DEFS.filter((def) => def.isUnlocked(progress)).map((def) => def.id);
}
