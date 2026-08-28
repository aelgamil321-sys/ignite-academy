import { createFileRoute } from "@tanstack/react-router";
import { HallOfFameContent } from "@/components/hall-of-fame-page";

export const Route = createFileRoute("/admin/honor-board/")({
  head: () => ({
    meta: [
      { title: "Honor Board — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminHonorBoardPage,
});

function AdminHonorBoardPage() {
  return <HallOfFameContent variant="admin" />;
}
