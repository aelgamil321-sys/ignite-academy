import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Presentation, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, gradeMatches } from "@/lib/grade-utils";
import {
  type LessonResourceItem,
  type LessonResourceType,
  uniqueLessonsForResources,
  useLessonLibraryResources,
} from "@/lib/lesson-library";

export const Route = createFileRoute("/resource-library")({
  head: () => ({
    meta: [
      { title: "Resource Library — Ignite Islamic Academy" },
      {
        name: "description",
        content: "Download lesson PDFs, PowerPoints, and worksheets — filterable by grade and lesson.",
      },
      { property: "og:title", content: "Resource Library — Ignite Islamic Academy" },
    ],
  }),
  component: ResourceLibraryPage,
});

const ICONS = { pdf: FileText, ppt: Presentation, worksheet: FileSpreadsheet } as const;

function ResourceLibraryPage() {
  const { tr, lang, dir, bi, locale } = useI18n();
  const resources = useLessonLibraryResources(locale);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | LessonResourceType>("all");
  const [gradeSlug, setGradeSlug] = useState("all");
  const [lessonId, setLessonId] = useState("all");

  const lessonOptions = useMemo(() => uniqueLessonsForResources(resources), [resources]);

  const filtered = useMemo(
    () =>
      resources.filter((r) => {
        const matchType = type === "all" || r.type === type;
        const matchGrade = gradeSlug === "all" || gradeMatches(r.gradeSlug, gradeSlug);
        const matchLesson = lessonId === "all" || r.lessonId === lessonId;
        const text = `${r.label} ${r.lessonTitle.en} ${r.lessonTitle.ar} ${r.fileName} ${gradeDisplayName(r.gradeSlug, "en")} ${gradeDisplayName(r.gradeSlug, "ar")}`.toLowerCase();
        return matchType && matchGrade && matchLesson && text.includes(q.toLowerCase());
      }),
    [resources, q, type, gradeSlug, lessonId],
  );

  return (
    <PageShell
      eyebrow={tr("nav_resources")}
      title={tr("res_title")}
      lead={tr("res_lead")}
      crumbs={[{ label: tr("res_title") }]}
    >
      <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr("res_search")}
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
        <select
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2.5 text-sm min-w-[180px] max-w-full"
        >
          <option value="all">{tr("rl_all_lessons")}</option>
          {lessonOptions.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {bi(lesson.title)}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {(["all", "pdf", "ppt", "worksheet"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                type === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary"
              }`}
            >
              {k === "all" ? tr("res_all") : k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState icon={FileText} title={tr("empty_lesson_resources")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={tr("empty_results")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <ResourceCard key={r.id} item={r} lang={lang} bi={bi} tr={tr} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ResourceCard({
  item,
  lang,
  bi,
  tr,
}: {
  item: LessonResourceItem;
  lang: string;
  bi: (text?: { en: string; ar: string } | null) => string;
  tr: (key: "download_pdf" | "download_ppt" | "download_worksheet") => string;
}) {
  const Icon = ICONS[item.type];
  const downloadLabel =
    item.type === "pdf" ? tr("download_pdf") : item.type === "ppt" ? tr("download_ppt") : tr("download_worksheet");

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15 text-gold shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">{item.label}</div>
        <div className="text-sm text-foreground/80 mt-1 truncate">{bi(item.lessonTitle)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {gradeDisplayName(item.gradeSlug, lang === "ar" ? "ar" : "en")}
          {item.unit.en || item.unit.ar ? ` · ${bi(item.unit)}` : ""}
        </div>
      </div>
      <a
        href={item.url}
        download={item.fileName}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors shrink-0"
      >
        <Download className="h-3.5 w-3.5" /> {downloadLabel}
      </a>
    </div>
  );
}
