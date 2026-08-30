import { createFileRoute } from "@tanstack/react-router";
import { GradeCatalogPanel } from "@/components/grade-catalog-panel";
import type { StageSlug } from "@/lib/stage-images";
import { useSchoolManagementPaths } from "@/lib/workspace-paths";

const STAGE_SLUGS = new Set<StageSlug>(["kindergarten", "elementary", "middle", "high"]);

export const adminGradesRouteSearch = (search: Record<string, unknown>) => ({
  stage:
    typeof search.stage === "string" && STAGE_SLUGS.has(search.stage as StageSlug)
      ? (search.stage as StageSlug)
      : undefined,
});

export const Route = createFileRoute("/admin/grades/")({
  validateSearch: adminGradesRouteSearch,
  head: () => ({
    meta: [
      { title: "Academic Stages — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminGradesIndex,
});

function AdminGradesIndex() {
  const { stage } = Route.useSearch();
  const paths = useSchoolManagementPaths();
  return <GradeCatalogPanel gradesBasePath={paths.grades} stageFilter={stage} />;
}
