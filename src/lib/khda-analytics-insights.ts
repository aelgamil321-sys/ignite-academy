import type { Lang } from "@/lib/i18n-config";
import { L } from "@/lib/i18n-config";
import {
  formatKhdaPct,
  khdaRatingFromScore,
  khdaRatingLabel,
  quantitativeDescriptor,
} from "@/lib/khda-performance";
import type { AdminAnalyticsSnapshot, AnalyticsGroupRow } from "@/lib/admin-analytics";
import { ANALYTICS_UNSET_KEY } from "@/lib/admin-analytics";
import type { KhdaAnalyticsEnrichment } from "@/lib/khda-analytics-enrichment";

export type KhdaInsightTemplateKey =
  | "khda_insight_best_grade"
  | "khda_insight_section_gap"
  | "khda_insight_meeting_target"
  | "khda_insight_best_section";

export type KhdaInsight = {
  id: string;
  templateKey: KhdaInsightTemplateKey;
  vars: Record<string, string>;
};

function groupLabel(row: AnalyticsGroupRow, lang: Lang): string {
  return L(row.labelEn, row.labelAr)[lang];
}

function bestGroupRow(rows: AnalyticsGroupRow[]): AnalyticsGroupRow | null {
  const eligible = rows.filter(
    (r) => r.key !== ANALYTICS_UNSET_KEY && r.studentCount > 0 && r.averageScorePct !== null,
  );
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => b.averageScorePct! - a.averageScorePct!)[0];
}

export function buildKhdaInsights(
  snapshot: AdminAnalyticsSnapshot,
  enrichment: KhdaAnalyticsEnrichment,
  lang: Lang,
): KhdaInsight[] {
  const insights: KhdaInsight[] = [];

  const bestGrade = bestGroupRow(snapshot.byGrade);
  if (bestGrade && bestGrade.averageScorePct !== null) {
    insights.push({
      id: "best-grade",
      templateKey: "khda_insight_best_grade",
      vars: {
        grade: groupLabel(bestGrade, lang),
        pct: formatKhdaPct(bestGrade.averageScorePct),
        ratingLabel: khdaRatingLabel(khdaRatingFromScore(bestGrade.averageScorePct), lang),
      },
    });
  }

  const gradeFiltered = snapshot.byGrade.filter(
    (r) => r.key !== ANALYTICS_UNSET_KEY && r.studentCount > 0,
  );
  const sectionRows = snapshot.bySection.filter(
    (r) => r.key !== ANALYTICS_UNSET_KEY && r.studentCount > 0 && r.averageScorePct !== null,
  );
  if (gradeFiltered.length === 1 && sectionRows.length >= 2) {
    const gradeAvg = gradeFiltered[0].averageScorePct;
    if (gradeAvg !== null) {
      const sorted = [...sectionRows].sort((a, b) => (a.averageScorePct ?? 0) - (b.averageScorePct ?? 0));
      const lowest = sorted[0];
      if (lowest.averageScorePct !== null) {
        const gap = gradeAvg - lowest.averageScorePct;
        if (gap >= 3) {
          insights.push({
            id: "section-gap",
            templateKey: "khda_insight_section_gap",
            vars: {
              section: groupLabel(lowest, lang),
              gap: String(gap),
            },
          });
        }
      }
    }
  }

  if (enrichment.meetingTargetPct !== null) {
    const qDesc = quantitativeDescriptor(enrichment.meetingTargetPct, lang);
    insights.push({
      id: "meeting-target",
      templateKey: "khda_insight_meeting_target",
      vars: {
        pct: String(enrichment.meetingTargetPct),
        qdescSuffix: qDesc ? ` — ${qDesc}` : "",
      },
    });
  }

  const bestSection = bestGroupRow(snapshot.bySection);
  if (bestSection && insights.length < 4) {
    insights.push({
      id: "best-section",
      templateKey: "khda_insight_best_section",
      vars: {
        section: groupLabel(bestSection, lang),
        pct: formatKhdaPct(bestSection.averageScorePct),
        ratingLabel: khdaRatingLabel(khdaRatingFromScore(bestSection.averageScorePct), lang),
      },
    });
  }

  return insights.slice(0, 4);
}
