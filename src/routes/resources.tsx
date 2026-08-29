import { createFileRoute } from "@tanstack/react-router";
import { StudentOrPublicPage } from "@/components/student-or-public-page";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { useAllResources } from "@/lib/cms";
import { grades } from "@/lib/curriculum";
import { gradeMatches } from "@/lib/grade-utils";
import { useOptionalStudentShell } from "@/lib/student-shell-context";
import { FileText, FileSpreadsheet, Presentation, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resource Library — Ignite Islamic Academy" },
      { name: "description", content: "Download PDFs, PowerPoints and worksheets for Islamic Studies — filterable by format and searchable across all grades." },
      { property: "og:title", content: "Resource Library — Ignite Islamic Academy" },
      { property: "og:description", content: "PDFs, PowerPoints and worksheets for Islamic Studies, KG1 to Grade 12." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/resources" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/resources" }],
  }),
  component: ResourcesPage,
});

const ICONS = { pdf: FileText, ppt: Presentation, worksheet: FileSpreadsheet } as const;

function ResourcesPage() {
  const { tr } = useI18n();

  return (
    <StudentOrPublicPage
      eyebrow={tr("nav_resources")}
      title={tr("res_title")}
      lead={tr("res_lead")}
      crumbs={[{ label: tr("nav_resources") }]}
    >
      <ResourcesContent />
    </StudentOrPublicPage>
  );
}

function ResourcesContent() {
  const { tr, lang, dir, bi } = useI18n();
  const studentShell = useOptionalStudentShell();
  const lockGradeSlug =
    studentShell?.hasGrade ? studentShell.gradeSlug : undefined;
  const resources = useAllResources();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "pdf" | "ppt" | "worksheet">("all");
  const [gradeSlug, setGradeSlug] = useState<string>(lockGradeSlug ?? "all");

  useEffect(() => {
    if (lockGradeSlug) setGradeSlug(lockGradeSlug);
  }, [lockGradeSlug]);

  const filtered = useMemo(() => resources.filter((r) => {
    const matchType = type === "all" || r.type === type;
    const rSlug = (r as { _gradeSlug?: string })._gradeSlug ?? r.grade.en;
    const matchGrade = gradeSlug === "all" || gradeMatches(rSlug, gradeSlug);
    const text = `${r.title.en} ${r.title.ar} ${r.subject.en} ${r.subject.ar} ${r.grade.en} ${r.grade.ar}`.toLowerCase();
    return matchType && matchGrade && text.includes(q.toLowerCase());
  }), [resources, q, type, gradeSlug]);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("res_search")}
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
        {(["all", "pdf", "ppt", "worksheet"] as const).map((k) => (
          <button key={k} onClick={() => setType(k)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${type === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}>
            {k === "all" ? tr("res_all") : k.toUpperCase()}
          </button>
        ))}
      </div>

      {resources.length === 0 ? (
        <EmptyState icon={FileText} title={tr("empty_files")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={tr("empty_results")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => {
            const Icon = ICONS[r.type];
            const downloadable = !!r._url;
            return (
              <div key={r.slug} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{bi(r.title)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{bi(r.grade)} · {bi(r.subject)} · {r.size}</div>
                </div>
                {downloadable ? (
                  <a href={r._url} download={r._fileName ?? bi(r.title)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary">
                    <Download className="h-3.5 w-3.5" /> {r.type.toUpperCase()}
                  </a>
                ) : (
                  <button onClick={() => toast.info(`${tr("download_pdf").split(" ")[0]}: ${bi(r.title)}`)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary">
                    <Download className="h-3.5 w-3.5" /> {r.type.toUpperCase()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
