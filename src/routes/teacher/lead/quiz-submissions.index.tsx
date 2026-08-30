import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { Route as AdminQuizSubmissionsRoute } from "@/routes/admin/quiz-submissions.index";
import { useI18n, L } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/quiz-submissions/")({
  head: () => ({
    meta: [
      { title: "Quiz Submissions — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherQuizSubmissionsPage,
});

function LeadTeacherQuizSubmissionsPage() {
  const { lang } = useI18n();
  const QuizSubmissionsPage = AdminQuizSubmissionsRoute.options.component;
  if (!QuizSubmissionsPage) return null;
  return (
    <>
      <LeadTeacherPageHeader
        title={L("Quiz Submissions", "إرسالات الاختبارات")[lang]}
        lead={L(
          "Review student quiz submissions and grade essay answers.",
          "راجع إرسالات الطلاب وقيّم الإجابات المقالية.",
        )[lang]}
      />
      <QuizSubmissionsPage />
    </>
  );
}
