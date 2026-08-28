import { createFileRoute } from "@tanstack/react-router";
import { WeeklyPlanDepartmentReview } from "@/components/weekly-plan-department-review";

export const Route = createFileRoute("/admin/weekly-planning/review/$planId")({
  head: () => ({
    meta: [
      { title: "Weekly Plan Review — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminWeeklyPlanReviewPage,
});

function AdminWeeklyPlanReviewPage() {
  const { planId } = Route.useParams();
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <WeeklyPlanDepartmentReview
        planId={planId}
        backTo="/admin/weekly-planning/dashboard"
      />
    </div>
  );
}
