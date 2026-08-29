import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StudentOrPublicPage } from "@/components/student-or-public-page";
import { useI18n, L } from "@/lib/i18n";
import { useAllVideos, type UnifiedVideo } from "@/lib/cms";
import { grades } from "@/lib/curriculum";
import { gradeMatches } from "@/lib/grade-utils";
import { SUBJECT_CATEGORIES } from "@/lib/categories";
import { useOptionalStudentShell } from "@/lib/student-shell-context";
import {
  Play, Clock, Search, Video as VideoIcon,
  BookOpen, ScrollText, Sparkles, Scale, MapPin, Heart,
} from "lucide-react";
import videoPlaceholder from "@/assets/video-placeholder.jpg";

export const Route = createFileRoute("/videos/")({
  head: () => ({
    meta: [
      { title: "Video Library — Ignite Islamic Academy" },
      { name: "description", content: "Islamic video library organised by Quran, Hadith, Aqeedah, Fiqh, Seerah and Islamic Values. Videos are added by the academy admin." },
      { property: "og:title", content: "Video Library — Ignite Islamic Academy" },
      { property: "og:description", content: "Islamic video library across six core subjects." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/videos" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/videos" }],
  }),
  component: VideosIndex,
});

type Category = {
  slug: string;
  name: { en: string; ar: string };
  icon: typeof VideoIcon;
  keywords: string[];
};

const ICONS = { quran: BookOpen, hadith: ScrollText, aqeedah: Sparkles, fiqh: Scale, seerah: MapPin, values: Heart } as const;

const CATEGORIES: Category[] = SUBJECT_CATEGORIES.map((c) => ({
  slug: c.slug,
  name: c.name,
  icon: ICONS[c.slug],
  keywords: [c.slug, c.name.en.toLowerCase(), c.name.ar],
}));

function categorize(v: UnifiedVideo): string | null {
  if (v.category) return v.category;
  const text = `${v.title.en} ${v.title.ar} ${v.description.en} ${v.description.ar}`.toLowerCase();
  for (const c of CATEGORIES) {
    if (c.keywords.some((k) => text.includes(k))) return c.slug;
  }
  return null;
}

function VideosIndex() {
  const { tr } = useI18n();

  return (
    <StudentOrPublicPage
      eyebrow={tr("nav_videos")}
      title={tr("vid_title")}
      lead={tr("vid_lead")}
      crumbs={[{ label: tr("nav_videos") }]}
    >
      <VideosContent />
    </StudentOrPublicPage>
  );
}

function VideosContent() {
  const { tr, lang, dir, bi } = useI18n();
  const studentShell = useOptionalStudentShell();
  const lockGradeSlug =
    studentShell?.hasGrade ? studentShell.gradeSlug : undefined;
  const videos = useAllVideos();
  const [q, setQ] = useState("");
  const [gradeSlug, setGradeSlug] = useState(lockGradeSlug ?? "all");

  useEffect(() => {
    if (lockGradeSlug) setGradeSlug(lockGradeSlug);
  }, [lockGradeSlug]);

  const filtered = useMemo(() => videos.filter((v) => {
    const vSlug = (v as { _gradeSlug?: string })._gradeSlug ?? v.grade.en;
    const matchGrade = gradeSlug === "all" || gradeMatches(vSlug, gradeSlug);
    const needle = q.toLowerCase();
    const text = `${v.title.en} ${v.title.ar} ${v.description.en} ${v.description.ar} ${v.grade.en} ${v.grade.ar}`.toLowerCase();
    return matchGrade && text.includes(needle);
  }), [videos, q, gradeSlug]);

  const byCategory = useMemo(() => {
    const map: Record<string, UnifiedVideo[]> = {};
    for (const c of CATEGORIES) map[c.slug] = [];
    for (const v of filtered) {
      const slug = categorize(v);
      if (slug) map[slug].push(v);
    }
    return map;
  }, [filtered]);

  const emptyMsg = L(
    "No videos available yet. Please check back later.",
    "لا توجد فيديوهات متاحة بعد. يرجى التحقق لاحقًا.",
  )[lang];

  return (
    <>
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("search_placeholder")}
            dir={dir}
            className="w-full rounded-full border border-border bg-card py-2.5 ps-10 pe-4 text-sm" />
        </div>
        {!lockGradeSlug ? (
          <select value={gradeSlug} onChange={(e) => setGradeSlug(e.target.value)}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm">
            <option value="all">{tr("filter_by_grade")}</option>
            {grades.map((g) => <option key={g.slug} value={g.slug}>{bi(g.name)}</option>)}
          </select>
        ) : null}
      </div>

      <div className="space-y-10">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const list = byCategory[c.slug];
          return (
            <section key={c.slug} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
              <header className="flex items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Link to="/categories/$category" params={{ category: c.slug }} className="font-display text-xl text-foreground hover:text-primary">
                    {bi(c.name)}
                  </Link>
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {list.length} {L("videos", "فيديو")[lang]}
                </span>
              </header>

              {list.length === 0 ? (
                <div className="relative">
                  <div className="relative aspect-[4/1] min-h-[180px] w-full">
                    <img src={videoPlaceholder} alt="" loading="lazy" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 grid place-content-center bg-primary/70 px-6 text-center text-primary-foreground">
                      <VideoIcon className="mx-auto h-8 w-8 opacity-90" />
                      <div className="mt-2 font-display text-base md:text-lg">{emptyMsg}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((v) => (
                    <Link key={v.slug} to="/videos/$slug" params={{ slug: v.slug }}
                      className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]">
                      <div className="relative grid aspect-video place-content-center bg-gradient-to-br from-primary via-primary to-brand-dark/60 text-primary-foreground">
                        {v._custom?.thumbnailUrl ? (
                          <img src={v._custom.thumbnailUrl} alt={bi(v.title)} className="absolute inset-0 h-full w-full object-cover" />
                        ) : null}
                        <div className="relative grid h-14 w-14 place-content-center rounded-full bg-gold/90 text-gold-foreground transition-transform group-hover:scale-110">
                          <Play className="ms-0.5 h-6 w-6" />
                        </div>
                        {v.duration && <span className="absolute end-2 bottom-2 rounded bg-black/50 px-2 py-0.5 text-xs">{v.duration}</span>}
                      </div>
                      <div className="p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-primary">{bi(v.grade)}</div>
                        <h3 className="mt-1 font-display text-lg leading-snug text-foreground">{bi(v.title)}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{bi(v.description)}</p>
                        {v.duration && (
                          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> {v.duration}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
