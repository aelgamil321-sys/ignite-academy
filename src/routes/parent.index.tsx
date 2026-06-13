import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { useAllParentGuides } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, LayoutDashboard, Users } from "lucide-react";

export const Route = createFileRoute("/parent/")({
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
  const parentGuides = useAllParentGuides();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (active) setSignedIn(Boolean(data.user));
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <PageShell eyebrow={tr("nav_parent")} title={tr("parent_title")} lead={tr("parent_lead")} crumbs={[{ label: tr("nav_parent") }]}>
      {signedIn && (
        <div className="mb-8 rounded-2xl border border-emerald/25 bg-gradient-to-br from-emerald/5 to-background p-6 shadow-[var(--shadow-soft)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-primary">{tr("parent_dashboard_title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{tr("parent_dashboard_lead")}</p>
          </div>
          <Link
            to="/parent/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shrink-0"
          >
            <LayoutDashboard className="h-4 w-4" />
            {tr("parent_dashboard_cta")}
          </Link>
        </div>
      )}
      <h2 className="font-display text-2xl text-primary mb-6 flex items-center gap-2">
        <Users className="h-6 w-6 text-emerald" /> {tr("parent_guides")}
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {parentGuides.map((g) => (
          <Link key={g.slug} to="/parent/$slug" params={{ slug: g.slug }}
            className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:border-emerald hover:shadow-[var(--shadow-elegant)] transition-all flex flex-col">
            <h3 className="font-display text-xl text-primary leading-snug">{g.title[lang]}</h3>
            <p className="mt-3 text-sm text-muted-foreground flex-1">{g.excerpt[lang]}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-emerald">
              {tr("read_more")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
