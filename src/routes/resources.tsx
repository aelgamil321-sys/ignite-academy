import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { useAllResources } from "@/lib/cms";
import { grades } from "@/lib/curriculum";
import { gradeMatches } from "@/lib/grade-utils";
import { FileText, FileSpreadsheet, Presentation, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
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
  const { tr, lang, dir } = useI18n();
  const resources = useAllResources();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "pdf" | "ppt" | "worksheet">("all");
  const [gradeSlug, setGradeSlug] = useState<string>("all");

  const filtered = useMemo(() => resources.filter((r) => {
    const matchType = type === "all" || r.type === type;
    const rSlug = (r as { _gradeSlug?: string })._gradeSlug ?? r.grade.en;
    const matchGrade = gradeSlug === "all" || gradeMatches(rSlug, gradeSlug);
    const text = `${r.title.en} ${r.title.ar} ${r.subject.en} ${r.subject.ar} ${r.grade.en} ${r.grade.ar}`.toLowerCase();
    return matchType && matchGrade && text.includes(q.toLowerCase());
  }), [resources, q, type, gradeSlug]);

  return (
    <PageShell eyebrow={tr("nav_resources")} title={tr("res_title")} lead={tr("res_lead")} crumbs={[{ label: tr("nav_resources") }]}>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("res_search")}
            dir={dir}
            className="w-full rounded-full border border-border bg-card ps-10 pe-4 py-2.5 text-sm" />
        </div>
        <select value={gradeSlug} onChange={(e) => setGradeSlug(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2.5 text-sm">
          <option value="all">{tr("filter_by_grade")}</option>
          {grades.map((g) => <option key={g.slug} value={g.slug}>{g.name[lang]}</option>)}
        </select>
        {(["all", "pdf", "ppt", "worksheet"] as const).map((k) => (
          <button key={k} onClick={() => setType(k)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${type === k ? "border-emerald bg-emerald text-emerald-foreground" : "border-border bg-card hover:border-emerald"}`}>
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
              <div key={r.slug} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15 text-gold shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{r.title[lang]}</div>
                  <div className="text-xs text-muted-foreground mt-1">{r.grade[lang]} · {r.subject[lang]} · {r.size}</div>
                </div>
                {downloadable ? (
                  <a href={r._url} download={r._fileName ?? r.title[lang]}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-emerald hover:text-emerald transition-colors">
                    <Download className="h-3.5 w-3.5" /> {r.type.toUpperCase()}
                  </a>
                ) : (
                  <button onClick={() => toast.info(`${tr("download_pdf").split(" ")[0]}: ${r.title[lang]}`)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-emerald hover:text-emerald transition-colors">
                    <Download className="h-3.5 w-3.5" /> {r.type.toUpperCase()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
