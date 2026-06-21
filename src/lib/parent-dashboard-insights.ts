import type { ParentPerformanceReport } from "@/lib/parent-performance-report";
import type { StudentProgressData } from "@/lib/student-progress";
import { L } from "@/lib/i18n";

/** Build parent-facing insight bullets from existing dashboard metrics (display only). */
export function buildParentInsights(
  report: ParentPerformanceReport,
  progress: StudentProgressData,
  lang: "en" | "ar",
): string[] {
  const insights: string[] = [];
  const { grade } = report.rankings;

  if (grade.rank !== null && grade.total > 0) {
    const topPct = Math.ceil((grade.rank / grade.total) * 100);
    if (topPct <= 25) {
      insights.push(
        lang === "ar"
          ? `ابنكم ضمن أفضل ${topPct}% من الصف`
          : `Your child is in the top ${topPct}% of the grade`,
      );
    }
  }

  if (report.averageQuizScorePct !== null) {
    insights.push(
      lang === "ar"
        ? `متوسط الدرجات ${report.averageQuizScorePct}%`
        : `Average score ${report.averageQuizScorePct}%`,
    );
  }

  if (progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons) {
    insights.push(
      lang === "ar" ? "أكمل جميع الدروس المتاحة" : "Completed all available lessons",
    );
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCert = progress.certificates.some(
    (c) => new Date(c.issuedAt).getTime() >= weekAgo,
  );
  if (recentCert) {
    insights.push(
      lang === "ar"
        ? "حصل على شهادة جديدة هذا الأسبوع"
        : "Earned a new certificate this week",
    );
  }

  if (progress.overallProgressPct >= 75) {
    insights.push(
      lang === "ar"
        ? `التقدّم الدراسي ${progress.overallProgressPct}%`
        : `Overall progress ${progress.overallProgressPct}%`,
    );
  }

  return insights.slice(0, 5);
}

export type ParentRecommendationTier = "excellent" | "good" | "needs_support" | "no_data";

export function resolveParentRecommendation(
  averageQuizScorePct: number | null,
  lang: "en" | "ar",
): { tier: ParentRecommendationTier; message: string } {
  if (averageQuizScorePct === null) {
    return {
      tier: "no_data",
      message: L(
        "Recommendations will appear after your child completes their first quiz.",
        "ستظهر التوصيات بعد إكمال ابنكم لأول اختبار.",
      )[lang],
    };
  }
  if (averageQuizScorePct >= 90) {
    return {
      tier: "excellent",
      message: L(
        "Your child is performing excellently and is encouraged to maintain this level.",
        "الطالب يحقق أداءً ممتازًا ويُنصح بالاستمرار على نفس المستوى.",
      )[lang],
    };
  }
  if (averageQuizScorePct >= 75) {
    return {
      tier: "good",
      message: L(
        "Good performance. We recommend extra review before upcoming assessments.",
        "أداء جيد، ويوصى بزيادة المراجعة قبل الاختبارات القادمة.",
      )[lang],
    };
  }
  return {
    tier: "needs_support",
    message: L(
      "Your child needs additional follow-up and academic support.",
      "يحتاج الطالب إلى متابعة إضافية ودعم أكاديمي.",
    )[lang],
  };
}

export function heroStatusLabel(
  status: ParentPerformanceReport["status"],
  lang: "en" | "ar",
): string {
  if (status === "excellent") return lang === "ar" ? "ممتاز" : "Excellent";
  if (status === "good") return lang === "ar" ? "جيد جداً" : "Very Good";
  if (status === "needs_support") return lang === "ar" ? "جيد" : "Good";
  return lang === "ar" ? "لا توجد بيانات بعد" : "No data yet";
}
