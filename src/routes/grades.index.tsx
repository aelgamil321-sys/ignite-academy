import { createFileRoute, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { enforceStudentOwnGradeCatalog } from "@/lib/student-route-guard";
import { PageShell } from "@/components/page-shell";
import { GradeCatalogPanel } from "@/components/grade-catalog-panel";
import { useI18n } from "@/lib/i18n";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/grades/")({
  beforeLoad: async () => {
    await blockParentFromStudentRoutes();
    await enforceStudentOwnGradeCatalog();
  },
  head: () =>
    publicPageHead({
      title: "Academic Stages — Ignite Islamic Academy",
      description:
        "Browse grades from KG through Grade 12 at Ignite Islamic Academy — curated Islamic Studies lessons and resources at Ignite School in Dubai, UAE.",
      path: "/grades",
      ogTitle: "Academic Stages — Ignite Islamic Academy",
      ogDescription: "All grades KG through 12 grouped by academic stage.",
    }),
  component: GradesIndex,
});

function GradesIndex() {
  const { tr } = useI18n();

  return (
    <PageShell
      eyebrow={tr("nav_stages")}
      title={tr("all_stages")}
      lead={tr("stages_desc")}
      crumbs={[{ label: tr("nav_stages") }]}
    >
      <GradeCatalogPanel gradesBasePath="/grades" />
    </PageShell>
  );
}
