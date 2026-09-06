import {
  KHDA_GOOD_OR_ABOVE_RATING,
  khdaRatingFromScore,
  type KhdaRating,
} from "@/lib/khda-performance";
import type { AdminAnalyticsSnapshot, AnalyticsGroupRow } from "@/lib/admin-analytics";
import { ANALYTICS_UNSET_KEY } from "@/lib/admin-analytics";
import {
  DEFAULT_TEACHING_SUBJECT,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";

export type SubmissionMeta = {
  student_id: string;
  percentage: number;
  submitted_at: string | null;
  lesson_id: string | null;
};

export type StudentScoreRow = {
  userId: string;
  averageScorePct: number | null;
  submissionCount: number;
};

export type KhdaDistributionBand = {
  rating: KhdaRating;
  studentCount: number;
  percentage: number;
};

export type TrendPoint = {
  periodKey: string;
  labelEn: string;
  labelAr: string;
  averageScorePct: number;
  submissionCount: number;
};

export type SubjectComparisonRow = {
  subject: TeachingSubjectType;
  studentCount: number;
  submissionCount: number;
  averageScorePct: number | null;
  certificatesEarned: number;
};

export type KhdaAnalyticsEnrichment = {
  distribution: KhdaDistributionBand[];
  distributionTotalStudents: number;
  trend: TrendPoint[] | null;
  subjectComparison: SubjectComparisonRow[] | null;
  meetingTargetCount: number;
  meetingTargetPct: number | null;
};

function averageRounded(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function buildStudentScoresFromPerformances(
  performances: Array<{ userId: string; averageScorePct: number | null; submissionCount: number }>,
): StudentScoreRow[] {
  return performances.map((p) => ({
    userId: p.userId,
    averageScorePct: p.averageScorePct,
    submissionCount: p.submissionCount,
  }));
}

export function buildKhdaDistribution(studentScores: StudentScoreRow[]): {
  bands: KhdaDistributionBand[];
  totalWithScores: number;
} {
  const rated = new Map<KhdaRating, number>();
  for (const band of [1, 2, 3, 4, 5, 6, 7, 8] as KhdaRating[]) rated.set(band, 0);

  let totalWithScores = 0;
  for (const row of studentScores) {
    if (row.submissionCount === 0 || row.averageScorePct === null) continue;
    const rating = khdaRatingFromScore(row.averageScorePct);
    if (rating === null) continue;
    rated.set(rating, (rated.get(rating) ?? 0) + 1);
    totalWithScores += 1;
  }

  const bands: KhdaDistributionBand[] = ([1, 2, 3, 4, 5, 6, 7, 8] as KhdaRating[]).map(
    (rating) => ({
      rating,
      studentCount: rated.get(rating) ?? 0,
      percentage:
        totalWithScores > 0
          ? Math.round(((rated.get(rating) ?? 0) / totalWithScores) * 100)
          : 0,
    }),
  );

  return { bands, totalWithScores };
}

const MIN_TREND_PERIODS = 2;
const MIN_TREND_SUBMISSIONS = 4;

export function buildPerformanceTrend(submissions: SubmissionMeta[]): TrendPoint[] | null {
  const dated = submissions.filter((s) => s.submitted_at);
  if (dated.length < MIN_TREND_SUBMISSIONS) return null;

  const byMonth = new Map<string, number[]>();
  for (const row of dated) {
    const d = new Date(row.submitted_at!);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(row.percentage);
    else byMonth.set(key, [row.percentage]);
  }

  if (byMonth.size < MIN_TREND_PERIODS) return null;

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, values]) => {
      const [year, month] = periodKey.split("-");
      const monthNum = Number(month);
      const monthNamesEn = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthNamesAr = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
      ];
      return {
        periodKey,
        labelEn: `${monthNamesEn[monthNum - 1] ?? month} ${year}`,
        labelAr: `${monthNamesAr[monthNum - 1] ?? month} ${year}`,
        averageScorePct: averageRounded(values)!,
        submissionCount: values.length,
      };
    });
}

export function buildSubjectComparison(
  submissions: SubmissionMeta[],
  lessonSubjects: Map<string, TeachingSubjectType>,
  studentIds: Set<string>,
  certificateCounts: Map<string, number>,
): SubjectComparisonRow[] | null {
  const subjects: TeachingSubjectType[] = ["islamic_education", "quran"];
  const rows: SubjectComparisonRow[] = [];

  for (const subject of subjects) {
    const subjectSubmissions = submissions.filter((s) => {
      if (!studentIds.has(s.student_id)) return false;
      const lessonSubject = s.lesson_id
        ? lessonSubjects.get(s.lesson_id) ?? DEFAULT_TEACHING_SUBJECT
        : DEFAULT_TEACHING_SUBJECT;
      return lessonSubject === subject;
    });

    const studentsWithSubs = new Set(subjectSubmissions.map((s) => s.student_id));
    if (studentsWithSubs.size === 0) continue;

    let certCount = 0;
    for (const sid of studentsWithSubs) certCount += certificateCounts.get(sid) ?? 0;

    rows.push({
      subject,
      studentCount: studentsWithSubs.size,
      submissionCount: subjectSubmissions.length,
      averageScorePct: averageRounded(subjectSubmissions.map((s) => s.percentage)),
      certificatesEarned: certCount,
    });
  }

  if (rows.length === 0) return null;
  if (rows.length === 1) return rows;
  return rows;
}

export function buildKhdaEnrichment(
  snapshot: AdminAnalyticsSnapshot,
  studentScores: StudentScoreRow[],
  submissions: SubmissionMeta[],
  lessonSubjects: Map<string, TeachingSubjectType>,
  studentIds: Set<string>,
  certificateCounts: Map<string, number>,
): KhdaAnalyticsEnrichment {
  const { bands, totalWithScores } = buildKhdaDistribution(studentScores);

  let meetingTargetCount = 0;
  for (const row of studentScores) {
    if (row.submissionCount === 0 || row.averageScorePct === null) continue;
    const rating = khdaRatingFromScore(row.averageScorePct);
    if (rating !== null && rating >= KHDA_GOOD_OR_ABOVE_RATING) meetingTargetCount += 1;
  }

  const meetingTargetPct =
    totalWithScores > 0 ? Math.round((meetingTargetCount / totalWithScores) * 100) : null;

  return {
    distribution: bands,
    distributionTotalStudents: totalWithScores,
    trend: buildPerformanceTrend(submissions),
    subjectComparison: buildSubjectComparison(
      submissions,
      lessonSubjects,
      studentIds,
      certificateCounts,
    ),
    meetingTargetCount,
    meetingTargetPct,
  };
}

export function filterGroupRowsForDisplay(rows: AnalyticsGroupRow[]): AnalyticsGroupRow[] {
  return rows.filter((row) => row.key !== ANALYTICS_UNSET_KEY && row.studentCount > 0);
}
