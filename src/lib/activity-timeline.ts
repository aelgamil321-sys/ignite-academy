import type { Bi } from "@/lib/curriculum";
import {
  evaluateStudentBadges,
  studentBadgeMeta,
  type StudentBadgeId,
} from "@/lib/student-badges";
import type { StudentProgressData } from "@/lib/student-progress";

export type ActivityTimelineItem =
  | {
      kind: "quiz_completed";
      at: string;
      lessonId: string;
      lessonTitle: Bi;
      scorePct: number;
      submissionId: string;
    }
  | {
      kind: "certificate_earned";
      at: string;
      lessonId: string;
      lessonTitle: Bi;
      scorePct: number;
      certificateId: string;
    }
  | {
      kind: "badge_unlocked";
      at: string;
      badgeId: StudentBadgeId;
      badgeIcon: string;
      badgeTitle: Bi;
    };

type SubmissionRow = {
  id: string;
  lesson_id: string;
  percentage: number;
  status: string;
  submitted_at: string;
};

type CertificateRow = {
  certificate_id: string;
  lesson_id: string;
  percentage: number;
  issued_at: string;
};

type SimState = {
  completedLessonIds: Set<string>;
  certificateCount: number;
  reviewedPercentages: number[];
  totalLessons: number;
};

function progressFromState(state: SimState): StudentProgressData {
  const completedLessons = state.completedLessonIds.size;
  const overallProgressPct =
    state.totalLessons > 0
      ? Math.round((completedLessons / state.totalLessons) * 1000) / 10
      : 0;
  const averageQuizScorePct =
    state.reviewedPercentages.length > 0
      ? Math.round(
          (state.reviewedPercentages.reduce((sum, value) => sum + value, 0) /
            state.reviewedPercentages.length) *
            10,
        ) / 10
      : null;

  return {
    gradeSlug: "",
    totalLessons: state.totalLessons,
    completedLessons,
    overallProgressPct,
    certificatesEarned: state.certificateCount,
    averageQuizScorePct,
    learningLevelEn: "",
    learningLevelAr: "",
    certificates: [],
    recentAchievements: [],
    activityTimeline: [],
  };
}

export function buildActivityTimeline({
  submissions,
  certificates,
  totalLessons,
  lessonTitleMap,
  limit = 20,
}: {
  submissions: SubmissionRow[];
  certificates: CertificateRow[];
  totalLessons: number;
  lessonTitleMap: Map<string, Bi>;
  limit?: number;
}): ActivityTimelineItem[] {
  const state: SimState = {
    completedLessonIds: new Set(),
    certificateCount: 0,
    reviewedPercentages: [],
    totalLessons,
  };
  const unlockedBadges = new Set<StudentBadgeId>();
  const timeline: ActivityTimelineItem[] = [];

  const events = [
    ...submissions.map((row) => ({
      type: "submission" as const,
      at: String(row.submitted_at ?? ""),
      lessonId: String(row.lesson_id),
      percentage: Number(row.percentage ?? 0),
      status: String(row.status ?? ""),
      id: String(row.id),
    })),
    ...certificates.map((row) => ({
      type: "certificate" as const,
      at: String(row.issued_at ?? ""),
      lessonId: String(row.lesson_id),
      percentage: Number(row.percentage ?? 0),
      certificateId: String(row.certificate_id),
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  for (const event of events) {
    if (!event.at) continue;

    const lessonTitle = lessonTitleMap.get(event.lessonId) ?? { en: "Lesson", ar: "درس" };

    if (event.type === "submission") {
      state.completedLessonIds.add(event.lessonId);
      if (event.status !== "pending_review") {
        state.reviewedPercentages.push(event.percentage);
      }
      timeline.push({
        kind: "quiz_completed",
        at: event.at,
        lessonId: event.lessonId,
        lessonTitle,
        scorePct: event.percentage,
        submissionId: event.id,
      });
    } else {
      state.certificateCount += 1;
      timeline.push({
        kind: "certificate_earned",
        at: event.at,
        lessonId: event.lessonId,
        lessonTitle,
        scorePct: event.percentage,
        certificateId: event.certificateId,
      });
    }

    const progress = progressFromState(state);
    for (const badgeId of evaluateStudentBadges(progress)) {
      if (unlockedBadges.has(badgeId)) continue;
      unlockedBadges.add(badgeId);
      const meta = studentBadgeMeta(badgeId);
      if (!meta) continue;
      timeline.push({
        kind: "badge_unlocked",
        at: event.at,
        badgeId,
        badgeIcon: meta.icon,
        badgeTitle: meta.title,
      });
    }
  }

  return timeline
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
