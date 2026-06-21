import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, ChevronLeft, Search, Layers, Video as VideoIcon, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { useI18n, L } from "@/lib/i18n";
import { getGrade } from "@/lib/curriculum";
import { useLessonsForGrade, useAllVideos, useAllResources, useCMS } from "@/lib/cms";
import { gradeMatches } from "@/lib/grade-utils";
import { useGradeContentPrefetch } from "@/hooks/use-cms-content-prefetch";
import { slugifyUnit } from "./grades.$grade.units.$unit";
import { GradeLessonsSection } from "@/components/grade-lessons-section";

export const Route = createFileRoute("/grades/$grade/")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { grade };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.grade.name.en ?? "Grade";
    return {
      meta: [
        { title: `${name} Islamic Studies — Ignite Islamic Academy` },
        { name: "description", content: `Islamic Studies lessons, worksheets, videos and quizzes for ${name} students at Ignite Islamic Academy.` },
        { property: "og:title", content: `${name} Islamic Studies — Ignite Islamic Academy` },
        { property: "og:description", content: `Lessons, worksheets, videos and quizzes for ${name}.` },
        { property: "og:url", content: `https://ignite-faith-learn.lovable.app/grades/${params.grade}` },
      ],
      links: [{ rel: "canonical", href: `https://ignite-faith-learn.lovable.app/grades/${params.grade}` }],
    };
  },
  component: GradePage,
  notFoundComponent: () => <div className="container-page py-20">Grade not found.</div>,
  errorComponent: ({ error }) => <div className="container-page py-20">Error: {error.message}</div>,
});

function GradePage() {
  const { grade } = Route.useLoaderData();
  const { tr, lang, dir, bi } = useI18n();
  const { lessons: cmsLessons } = useCMS();
  const lessons = useLessonsForGrade(grade.slug);
  const gradeCustomLessons = useMemo(
    () => cmsLessons.filter((l) => l.published && gradeMatches(l.grade, grade.slug)),
    [cmsLessons, grade.slug],
  );
  useGradeContentPrefetch(gradeCustomLessons);
  const allVideos = useAllVideos();
  const allResources = useAllResources();
  const [q, setQ] = useState("");

  const gradeVideos = allVideos.filter((v) => {
    const slug = (v as { _gradeSlug?: string })._gradeSlug;
    return slug ? gradeMatches(slug, grade.slug) : gradeMatches(v.grade.en, grade.slug);
  });
  const gradeResources = allResources.filter((r) => {
    const slug = (r as { _gradeSlug?: string })._gradeSlug;
    return slug ? gradeMatches(slug, grade.slug) : gradeMatches(r.grade.en, grade.slug);
  });

  const units = useMemo(() => {
    const map = new Map<string, { slug: string; name: { en: string; ar: string }; count: number }>();
    lessons.forEach((l) => {
      const slug = slugifyUnit(l.unit.en || l.unit.ar);
      const cur = map.get(slug);
      if (cur) cur.count += 1;
      else map.set(slug, { slug, name: l.unit, count: 1 });
    });
    return Array.from(map.values());
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return gradeCustomLessons;
    return gradeCustomLessons.filter((l) =>
      `${l.title.en} ${l.title.ar} ${l.unit.en} ${l.unit.ar} ${l.outcome.en} ${l.outcome.ar}`
        .toLowerCase()
        .includes(needle),
    );
  }, [gradeCustomLessons, q]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-cream to-background border-b border-border">
          <div className="container-page py-12">
            <div className="mb-5"><Breadcrumbs items={[{ label: tr("nav_stages"), to: "/grades" }, { label: bi(grade.name) }]} /></div>
            <Link to="/grades" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5">
              <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              {tr("back_to_grades")}
            </Link>
            <div className="text-xs uppercase tracking-[0.22em] text-primary mb-2">{bi(grade.stage)}</div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground">{bi(grade.name)}</h1>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
              <Stat icon={BookOpen} value={lessons.length} label={tr("stat_lessons")} />
              <Stat icon={Layers} value={units.length} label={L("Units", "الوحدات")[lang]} />
              <Stat icon={VideoIcon} value={gradeVideos.length} label={L("Videos", "الفيديوهات")[lang]} />
              <Stat icon={FileText} value={gradeResources.length} label={L("Resources", "الموارد")[lang]} />
            </div>
          </div>
        </section>

        <section className="container-page pt-14 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <h2 className="font-display text-2xl text-foreground">{L("Units", "الوحدات")[lang]}</h2>
          </div>
          {units.length === 0 ? (
            <EmptyState
              icon={Layers}
              title={tr("empty_units")}
              description={L(
                "Units will appear here once lessons are added for this grade.",
                "ستظهر الوحدات هنا فور إضافة دروس لهذا الصف.",
              )[lang]}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {units.map((u) => (
                <Link
                  key={u.slug}
                  to="/grades/$grade/units/$unit"
                  params={{ grade: grade.slug, unit: u.slug }}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-primary hover:shadow-[var(--shadow-soft)] transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-primary truncate">{bi(u.name) || u.name.en || u.name.ar}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{u.count} {tr("lesson")}</div>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-primary shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="container-page py-14">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <h2 className="font-display text-2xl text-foreground">{L("Lessons", "الدروس")[lang]}</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tr("search_placeholder")}
                className="w-full rounded-full border border-border bg-card ps-10 pe-4 py-2.5 text-sm"
                dir={dir}
              />
            </div>
          </div>

          {lessons.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={tr("empty_lessons")}
              description={L(
                "An administrator has not added lessons for this grade yet.",
                "لم يضف الإداري بعد أي دروس لهذا الصف.",
              )[lang]}
            />
          ) : filteredLessons.length === 0 ? (
            <EmptyState icon={Search} title={tr("empty_results")} />
          ) : (
            <GradeLessonsSection gradeSlug={grade.slug} lessons={filteredLessons} />
          )}
        </section>

        {(gradeVideos.length > 0 || gradeResources.length > 0) && (
          <section className="container-page pb-16 grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl text-foreground inline-flex items-center gap-2"><VideoIcon className="h-5 w-5 text-primary" /> {tr("nav_videos")}</h2>
                <Link to="/videos" className="text-sm text-primary hover:underline">{tr("view_all")}</Link>
              </div>
              {gradeVideos.length === 0 ? (
                <EmptyState icon={VideoIcon} title={tr("empty_videos")} />
              ) : (
                <ul className="space-y-2">
                  {gradeVideos.slice(0, 4).map((v) => (
                    <li key={v.slug}>
                      <Link to="/videos/$slug" params={{ slug: v.slug }} className="block rounded-lg border border-border bg-card px-4 py-3 text-sm hover:border-primary">
                        {bi(v.title)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl text-foreground inline-flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> {tr("nav_resources")}</h2>
                <Link to="/resources" className="text-sm text-primary hover:underline">{tr("view_all")}</Link>
              </div>
              {gradeResources.length === 0 ? (
                <EmptyState icon={FileText} title={tr("empty_files")} />
              ) : (
                <ul className="space-y-2">
                  {gradeResources.slice(0, 4).map((r) => (
                    <li key={r.slug} className="rounded-lg border border-border bg-card px-4 py-3 text-sm flex items-center justify-between gap-3">
                      <span className="truncate">{bi(r.title)}</span>
                      <span className="text-xs text-muted-foreground">{r.type.toUpperCase()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary" /> {label}</div>
      <div className="font-display text-2xl text-foreground mt-1">{value}</div>
    </div>
  );
}
