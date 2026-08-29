import { createFileRoute, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { enforceStudentOwnGradeCatalog } from "@/lib/student-route-guard";
import { PageShell } from "@/components/page-shell";
import { GradeCatalogPanel } from "@/components/grade-catalog-panel";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/grades/")({
  beforeLoad: async () => {
    await blockParentFromStudentRoutes();
    await enforceStudentOwnGradeCatalog();
  },
  head: () => ({
    meta: [
      { title: "Academic Stages — Ignite Islamic Academy" },
      { name: "description", content: "Browse all grades from KG1 to Grade 12, grouped by academic stage, with curated Islamic Studies lessons and resources." },
      { property: "og:title", content: "Academic Stages — Ignite Islamic Academy" },
      { property: "og:description", content: "All grades KG1–12 grouped by academic stage." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/grades" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/grades" }],
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
