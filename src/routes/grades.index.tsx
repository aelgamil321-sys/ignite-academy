import { createFileRoute, Link } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap, BookOpen, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { grades, stages } from "@/lib/curriculum";

export const Route = createFileRoute("/grades/")({
  beforeLoad: () => blockParentFromStudentRoutes(),
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
  const { tr, lang, dir } = useI18n();
  const [q, setQ] = useState("");

  const filteredGrades = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return grades;
    return grades.filter((g) =>
      `${g.name.en} ${g.name.ar} ${g.stage.en} ${g.stage.ar}`.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <PageShell
      eyebrow={tr("nav_stages")}
      title={tr("all_stages")}
      lead={tr("stages_desc")}
      crumbs={[{ label: tr("nav_stages") }]}
    >
      <div className="mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr("filter_by_grade")}
            className="w-full rounded-full border border-border bg-card ps-10 pe-4 py-2.5 text-sm"
            dir={dir}
          />
        </div>
      </div>

      <div className="space-y-12">
        {stages.map((s) => {
          const stageGrades = filteredGrades.filter((g) => s.gradeSlugs.includes(g.slug));
          if (stageGrades.length === 0) return null;
          return (
            <section key={s.slug}>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-emerald mb-1">{tr("stage_overview")}</div>
                  <h2 className="font-display text-3xl text-primary">{s.name[lang]}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{s.desc[lang]}</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {stageGrades.map((g) => (
                  <Link
                    key={g.slug}
                    to="/grades/$grade"
                    params={{ grade: g.slug }}
                    className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] hover:border-emerald transition-all"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald text-primary-foreground mb-4">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="font-display text-xl text-primary">{g.name[lang]}</div>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> {g.lessons.length} {tr("lesson")}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:text-emerald">
                      {tr("view_lessons")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {filteredGrades.length === 0 && (
          <EmptyState icon={Search} title={tr("empty_results")} />
        )}
      </div>
    </PageShell>
  );
}
