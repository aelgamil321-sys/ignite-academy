import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Clock, BookOpen, ChevronLeft, Search, Layers, Video as VideoIcon, FileText, ClipboardCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { getGrade } from "@/lib/curriculum";
import { useLessonsForGrade, useAllVideos, useAllResources } from "@/lib/cms";
import { gradeMatches } from "@/lib/grade-utils";
import { slugifyUnit } from "./grades.$grade.units.$unit";

export const Route = createFileRoute("/grades/$grade/")({
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
  const { tr, lang, dir } = useI18n();
  const lessons = useLessonsForGrade(grade.slug);
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
    if (!needle) return lessons;
    return lessons.filter((l) =>
      `${l.title.en} ${l.title.ar} ${l.unit.en} ${l.unit.ar} ${l.subject.en} ${l.subject.ar}`
        .toLowerCase()
        .includes(needle),
    );
  }, [lessons, q]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-cream to-background border-b border-border">
          <div className="container-page py-12">
            <div className="mb-5"><Breadcrumbs items={[{ label: tr("nav_stages"), to: "/grades" }, { label: grade.name[lang] }]} /></div>
            <Link to="/grades" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5">
              <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              {tr("back_to_grades")}
            </Link>
            <div className="text-xs uppercase tracking-[0.22em] text-emerald mb-2">{grade.stage[lang]}</div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-primary">{grade.name[lang]}</h1>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
              <Stat icon={BookOpen} value={lessons.length} label={tr("stat_lessons")} />
              <Stat icon={Layers} value={units.length} label={lang === "ar" ? "الوحدات" : "Units"} />
              <Stat icon={VideoIcon} value={gradeVideos.length} label={lang === "ar" ? "الفيديوهات" : "Videos"} />
              <Stat icon={FileText} value={gradeResources.length} label={lang === "ar" ? "الموارد" : "Resources"} />
            </div>
          </div>
        </section>

        <section className="container-page pt-14 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <h2 className="font-display text-2xl text-primary">{lang === "ar" ? "الوحدات" : "Units"}</h2>
          </div>
          {units.length === 0 ? (
            <EmptyState icon={Layers} title={tr("empty_units")} description={lang === "ar" ? "ستظهر الوحدات هنا فور إضافة دروس لهذا الصف." : "Units will appear here once lessons are added for this grade."} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {units.map((u) => (
                <Link
                  key={u.slug}
                  to="/grades/$grade/units/$unit"
                  params={{ grade: grade.slug, unit: u.slug }}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-emerald hover:shadow-[var(--shadow-soft)] transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-primary truncate">{u.name[lang] || u.name.en || u.name.ar}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{u.count} {tr("lesson")}</div>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-emerald shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="container-page py-14">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <h2 className="font-display text-2xl text-primary">{lang === "ar" ? "الدروس" : "Lessons"}</h2>
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
            <EmptyState icon={BookOpen} title={tr("empty_lessons")} description={lang === "ar" ? "لم يضف الإداري بعد أي دروس لهذا الصف." : "An administrator has not added lessons for this grade yet."} />
          ) : filteredLessons.length === 0 ? (
            <EmptyState icon={Search} title={tr("empty_results")} />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredLessons.map((l, i) => (
                <Link
                  key={l.slug}
                  to="/grades/$grade/$lesson"
                  params={{ grade: grade.slug, lesson: l.slug }}
                  className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] hover:border-emerald transition-all flex flex-col"
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-emerald mb-2">
                    {tr("lesson")} {i + 1} · {l.subject[lang]}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-primary leading-snug">{l.title[lang]}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{l.unit[lang]}</p>
                  <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {l.duration} {tr("minutes")}</span>
                    <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {l.quiz.length} Q</span>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-emerald">
                    {tr("explore")}
                    <ArrowRight className={`h-4 w-4 transition-transform ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {(gradeVideos.length > 0 || gradeResources.length > 0) && (
          <section className="container-page pb-16 grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl text-primary inline-flex items-center gap-2"><VideoIcon className="h-5 w-5 text-emerald" /> {tr("nav_videos")}</h2>
                <Link to="/videos" className="text-sm text-emerald hover:underline">{tr("view_all")}</Link>
              </div>
              {gradeVideos.length === 0 ? (
                <EmptyState icon={VideoIcon} title={tr("empty_videos")} />
              ) : (
                <ul className="space-y-2">
                  {gradeVideos.slice(0, 4).map((v) => (
                    <li key={v.slug}>
                      <Link to="/videos/$slug" params={{ slug: v.slug }} className="block rounded-lg border border-border bg-card px-4 py-3 text-sm hover:border-emerald">
                        {v.title[lang]}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl text-primary inline-flex items-center gap-2"><FileText className="h-5 w-5 text-emerald" /> {tr("nav_resources")}</h2>
                <Link to="/resources" className="text-sm text-emerald hover:underline">{tr("view_all")}</Link>
              </div>
              {gradeResources.length === 0 ? (
                <EmptyState icon={FileText} title={tr("empty_files")} />
              ) : (
                <ul className="space-y-2">
                  {gradeResources.slice(0, 4).map((r) => (
                    <li key={r.slug} className="rounded-lg border border-border bg-card px-4 py-3 text-sm flex items-center justify-between gap-3">
                      <span className="truncate">{r.title[lang]}</span>
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-emerald" /> {label}</div>
      <div className="font-display text-2xl text-primary mt-1">{value}</div>
    </div>
  );
}
