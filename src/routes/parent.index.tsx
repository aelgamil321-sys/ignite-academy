import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { ParentAccountRequired } from "@/components/parent-account-required";
import { useI18n } from "@/lib/i18n";
import { useAllParentGuides } from "@/lib/cms";
import { resolveParentCornerAccess } from "@/lib/parent-corner-access";
import { ArrowRight, Users } from "lucide-react";

export const Route = createFileRoute("/parent/")({
  beforeLoad: async () => {
    const access = await resolveParentCornerAccess();
    if (access.kind === "guest") {
      throw redirect({ to: "/auth", search: { mode: "login", accountType: "parent" } });
    }
    if (access.kind === "parent") {
      throw redirect({ to: "/parent/dashboard" });
    }
  },
  loader: async () => {
    const access = await resolveParentCornerAccess();
    return { showStudentNotice: access.kind === "student" };
  },
  head: () => ({
    meta: [
      { title: "Parent Corner — Ignite Islamic Academy" },
      { name: "description", content: "Parent guides, resources and tips to support your child's Islamic education at home, from KG1 through Grade 12." },
      { property: "og:title", content: "Parent Corner — Ignite Islamic Academy" },
      { property: "og:description", content: "Guides and resources for parents supporting Islamic education at home." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/parent" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/parent" }],
  }),
  component: ParentPage,
});

function ParentPage() {
  const { tr, lang, dir } = useI18n();
  const { showStudentNotice } = Route.useLoaderData();
  const parentGuides = useAllParentGuides();

  return (
    <PageShell eyebrow={tr("nav_parent")} title={tr("parent_title")} lead={tr("parent_lead")} crumbs={[{ label: tr("nav_parent") }]}>
      {showStudentNotice && <ParentAccountRequired />}
      <h2 className="font-display text-2xl text-foreground mb-6 flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" /> {tr("parent_guides")}
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {parentGuides.map((g) => (
          <Link key={g.slug} to="/parent/$slug" params={{ slug: g.slug }}
            className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:border-primary hover:shadow-[var(--shadow-elegant)] transition-all flex flex-col">
            <h3 className="font-display text-xl text-foreground leading-snug">{g.title[lang]}</h3>
            <p className="mt-3 text-sm text-muted-foreground flex-1">{g.excerpt[lang]}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-primary">
              {tr("read_more")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
