import type { TKey } from "@/lib/i18n";
import type { ParentPerformanceReport } from "@/lib/parent-performance-report";
import type { StudentProgressData } from "@/lib/student-progress";

type Tr = (key: TKey) => string;
type Trf = (key: TKey, vars: Record<string, string | number>) => string;

/** Build parent-facing insight bullets from existing dashboard metrics (display only). */
export function buildParentInsights(
  report: ParentPerformanceReport,
  progress: StudentProgressData,
  tr: Tr,
  trf: Trf,
): string[] {
  const insights: string[] = [];
  const { grade } = report.rankings;

  if (grade.rank !== null && grade.total > 0) {
    const topPct = Math.ceil((grade.rank / grade.total) * 100);
    if (topPct <= 25) {
      insights.push(trf("parent_insight_top_pct", { n: topPct }));
    }
  }

  if (report.averageQuizScorePct !== null) {
    insights.push(trf("parent_insight_avg_score", { n: report.averageQuizScorePct }));
  }

  if (progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons) {
    insights.push(tr("parent_insight_all_lessons"));
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCert = progress.certificates.some(
    (c) => new Date(c.issuedAt).getTime() >= weekAgo,
  );
  if (recentCert) {
    insights.push(tr("parent_insight_recent_cert"));
  }

  if (progress.overallProgressPct >= 75) {
    insights.push(trf("parent_insight_progress", { n: progress.overallProgressPct }));
  }

  return insights.slice(0, 5);
}

export type ParentRecommendationTier = "excellent" | "good" | "needs_support" | "no_data";

export function resolveParentRecommendation(
  averageQuizScorePct: number | null,
  tr: Tr,
): { tier: ParentRecommendationTier; message: string } {
  if (averageQuizScorePct === null) {
    return { tier: "no_data", message: tr("parent_rec_no_data") };
  }
  if (averageQuizScorePct >= 90) {
    return { tier: "excellent", message: tr("parent_rec_excellent") };
  }
  if (averageQuizScorePct >= 75) {
    return { tier: "good", message: tr("parent_rec_good") };
  }
  return { tier: "needs_support", message: tr("parent_rec_support") };
}

export function heroStatusLabel(
  status: ParentPerformanceReport["status"],
  tr: Tr,
): string {
  if (status === "excellent") return tr("parent_status_excellent");
  if (status === "good") return tr("parent_status_very_good");
  if (status === "needs_support") return tr("parent_status_good");
  return tr("parent_status_no_data");
}

export function recommendationTierLabel(tier: ParentRecommendationTier, tr: Tr): string {
  if (tier === "excellent") return tr("parent_rec_tier_excellent");
  if (tier === "good") return tr("parent_rec_tier_good");
  if (tier === "needs_support") return tr("parent_rec_tier_support");
  return tr("parent_rec_tier_awaiting");
}
