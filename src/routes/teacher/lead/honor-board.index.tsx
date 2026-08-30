import { createFileRoute } from "@tanstack/react-router";
import { HallOfFameContent } from "@/components/hall-of-fame-page";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/honor-board/")({
  head: () => ({
    meta: [
      { title: "Honor Board — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherHonorBoardPage,
});

function LeadTeacherHonorBoardPage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader
        title={tr("admin_home_honor_board_title")}
        lead={tr("admin_home_honor_board_lead")}
      />
      <HallOfFameContent variant="admin" />
    </>
  );
}
