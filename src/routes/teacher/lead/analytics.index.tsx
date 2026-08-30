import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminAnalyticsPage } from "@/routes/admin/analytics.index";
import { useI18n, L } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/analytics/")({
  head: () => ({
    meta: [
      { title: "Analytics — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherAnalyticsPage,
});

function LeadTeacherAnalyticsPage() {
  const { tr, lang } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader
        title={L("Analytics", "التحليلات")[lang]}
        lead={L(
          "Compare student quiz performance and certificates by grade, section, and Islamic group.",
          "قارن أداء الطلاب في الاختبارات والشهادات حسب الصف والشعبة والمجموعة الإسلامية.",
        )[lang]}
      />
      <AdminAnalyticsPage />
    </>
  );
}
