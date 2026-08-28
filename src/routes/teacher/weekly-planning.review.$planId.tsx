import { createFileRoute } from "@tanstack/react-router";
import { WeeklyPlanDepartmentReview } from "@/components/weekly-plan-department-review";

export const Route = createFileRoute("/teacher/weekly-planning/review/$planId")({
  component: LeadTeacherWeeklyPlanReviewPage,
});

function LeadTeacherWeeklyPlanReviewPage() {
  const { planId } = Route.useParams();
  return (
    <WeeklyPlanDepartmentReview
      planId={planId}
      backTo="/teacher/weekly-planning/dashboard"
    />
  );
}
