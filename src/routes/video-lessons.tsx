import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, Play, Search, Video as VideoIcon } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { useI18n, type TKey } from "@/lib/i18n";
import { contentLocale } from "@/lib/i18n-config";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, gradeMatches } from "@/lib/grade-utils";
import {
  groupLessonVideosByGrade,
  type LessonVideoItem,
  useLessonVideoItems,
} from "@/lib/lesson-library";

export const Route = createFileRoute("/video-lessons")({
  head: () => ({
    meta: [
      { title: "Video Lessons — Ignite Islamic Academy" },
      {
        name: "description",
        content: "Watch lesson videos organised by grade — Arabic and English links for each lesson.",
      },
      { property: "og:title", content: "Video Lessons — Ignite Islamic Academy" },
    ],
  }),
  component: VideoLessonsPage,
});

function VideoLessonsPage() {
  const { tr, lang, dir, bi } = useI18n();
  const items = useLessonVideoItems();
  const [q, setQ] = useState("");
  const [gradeSlug, setGradeSlug] = useState("all");

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchGrade = gradeSlug === "all" || gradeMatches(item.gradeSlug, gradeSlug);
        const text = `${item.title.en} ${item.title.ar} ${item.unit.en} ${item.unit.ar} ${gradeDisplayName(item.gradeSlug, "en")} ${gradeDisplayName(item.gradeSlug, "ar")}`.toLowerCase();
        return matchGrade && text.includes(q.toLowerCase());
      }),
    [items, q, gradeSlug],
  );

  const grouped = useMemo(() => groupLessonVideosByGrade(filtered), [filtered]);

  return (
    <PageShell
      eyebrow={tr("nav_videos")}
      title={tr("vid_title")}
      lead={tr("vid_lead")}
      crumbs={[{ label: tr("vid_title") }]}
    >
      <div className="flex flex-col gap-3 mb-10 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr("search_placeholder")}
            dir={dir}
            className="w-full rounded-full border border-border bg-card ps-10 pe-4 py-2.5 text-sm"
          />
        </div>
        <select
          value={gradeSlug}
          onChange={(e) => setGradeSlug(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2.5 text-sm min-w-[160px]"
        >
          <option value="all">{tr("filter_by_grade")}</option>
          {grades.map((g) => (
            <option key={g.slug} value={g.slug}>
              {bi(g.name)}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={VideoIcon} title={tr("empty_lesson_videos")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={tr("empty_results")} />
      ) : (
        <div className="space-y-10">
          {grouped.map((group) => (
            <section
              key={group.gradeSlug}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-[var(--shadow-soft)]"
            >
              <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                <h2 className="font-display text-xl sm:text-2xl text-foreground">{bi(group.gradeName)}</h2>
                <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">
                  {group.lessons.length} {tr("stat_lessons")}
                </span>
              </header>
              <div className="divide-y divide-border">
                {group.lessons.map((lesson) => (
                  <LessonVideoRow key={lesson.lessonId} lesson={lesson} bi={bi} tr={tr} lang={lang} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function LessonVideoRow({
  lesson,
  bi,
  tr,
  lang,
}: {
  lesson: LessonVideoItem;
  bi: (text?: { en: string; ar: string } | null) => string;
  tr: (key: TKey) => string;
  lang: string;
}) {
  return (
    <div className="p-5 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold">
          {gradeDisplayName(lesson.gradeSlug, contentLocale(lang))}
          {lesson.unit.en || lesson.unit.ar ? ` · ${bi(lesson.unit)}` : ""}
        </div>
        <h3 className="mt-1 font-display text-lg sm:text-xl text-foreground leading-snug">{bi(lesson.title)}</h3>
        <Link
          to="/grades/$grade/$lesson"
          params={{ grade: lesson.gradeSlug, lesson: lesson.lessonId }}
          className="mt-2 inline-flex text-sm text-primary hover:underline"
        >
          {tr("open_lesson")}
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 shrink-0">
        {lesson.videos.map((video) => (
          <a
            key={`${lesson.lessonId}-${video.lang}`}
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <Play className="h-4 w-4 shrink-0" />
            <span>{tr(video.labelKey)}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
        ))}
      </div>
    </div>
  );
}
