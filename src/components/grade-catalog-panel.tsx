import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap, BookOpen, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { grades, stages } from "@/lib/curriculum";
import type { StageSlug } from "@/lib/stage-images";
import { cn } from "@/lib/utils";

type GradeCatalogPanelProps = {
  /** Base path for grade detail routes, e.g. `/grades`, `/admin/grades`, or `/teacher/lead/grades`. */
  gradesBasePath: string;
  /** Optional stage slug — show only that stage section (kindergarten, elementary, middle, high). */
  stageFilter?: StageSlug;
};

export function GradeCatalogPanel({ gradesBasePath, stageFilter }: GradeCatalogPanelProps) {
  const { tr, dir, bi } = useI18n();
  const isAdminGrades = gradesBasePath.endsWith("/admin/grades") || gradesBasePath.endsWith("/lead/grades");
  const [q, setQ] = useState("");

  const filteredGrades = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return grades;
    return grades.filter((g) =>
      `${g.name.en} ${g.name.ar} ${g.stage.en} ${g.stage.ar}`.toLowerCase().includes(needle),
    );
  }, [q]);

  const visibleStages = stageFilter
    ? stages.filter((s) => s.slug === stageFilter)
    : stages;

  const gradeLink = (slug: string) => `${gradesBasePath}/${slug}`;

  return (
    <>
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
        {visibleStages.map((s) => {
          const stageGrades = filteredGrades.filter((g) => s.gradeSlugs.includes(g.slug));
          if (stageGrades.length === 0) return null;
          return (
            <section key={s.slug}>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-primary mb-1">{tr("stage_overview")}</div>
                  <h2
                    className={cn(
                      "font-display text-foreground",
                      isAdminGrades ? "text-2xl sm:text-3xl break-words" : "text-3xl",
                    )}
                  >
                    {bi(s.name)}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{bi(s.desc)}</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {stageGrades.map((g) => (
                  <Link
                    key={g.slug}
                    to={gradeLink(g.slug)}
                    className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] hover:border-primary transition-all"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-primary text-primary-foreground mb-4">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="font-display text-xl text-foreground">{bi(g.name)}</div>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> {g.lessons.length} {tr("lesson")}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:text-primary">
                      {tr("view_lessons")}{" "}
                      <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {filteredGrades.length === 0 ? (
          <EmptyState icon={Search} title={tr("empty_results")} />
        ) : null}
      </div>
    </>
  );
}
