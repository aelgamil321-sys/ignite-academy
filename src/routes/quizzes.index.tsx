import { createFileRoute, Link } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { useQuizzesFromCMS } from "@/lib/cms";
import { grades } from "@/lib/curriculum";
import { gradeMatches } from "@/lib/grade-utils";
import { ClipboardCheck, ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/quizzes/")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  head: () => ({
    meta: [
      { title: "Online Quizzes — Ignite Islamic Academy" },
      { name: "description", content: "Test your Islamic Studies knowledge with interactive quizzes for every grade — instant scoring, bilingual questions in English and Arabic." },
      { property: "og:title", content: "Online Quizzes — Ignite Islamic Academy" },
      { property: "og:description", content: "Interactive bilingual Islamic Studies quizzes for KG1 to Grade 12." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/quizzes" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/quizzes" }],
  }),
  component: QuizzesIndex,
});

function QuizzesIndex() {
  const { tr, lang, dir, bi } = useI18n();
  const quizzes = useQuizzesFromCMS();
  const [q, setQ] = useState("");
  const [gradeSlug, setGradeSlug] = useState("all");

  const filtered = useMemo(() => quizzes.filter((qz) => {
    const slug = qz._gradeSlug ?? "";
    const matchGrade = gradeSlug === "all" || gradeMatches(slug, gradeSlug);
    const text = `${qz.title.en} ${qz.title.ar} ${qz.description.en} ${qz.description.ar}`.toLowerCase();
    return matchGrade && text.includes(q.toLowerCase());
  }), [quizzes, q, gradeSlug]);

  return (
    <PageShell
      eyebrow={tr("nav_quizzes")}
      title={tr("quiz_title")}
      lead={tr("quiz_lead")}
      crumbs={[{ label: tr("nav_quizzes") }]}
    >
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("search_placeholder")}
            dir={dir}
            className="w-full rounded-full border border-border bg-card ps-10 pe-4 py-2.5 text-sm" />
        </div>
        <select value={gradeSlug} onChange={(e) => setGradeSlug(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2.5 text-sm">
          <option value="all">{tr("filter_by_grade")}</option>
          {grades.map((g) => <option key={g.slug} value={g.slug}>{bi(g.name)}</option>)}
        </select>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={tr("empty_quizzes")} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={tr("empty_results")} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((qz) => (
            <Link
              key={qz.slug}
              to="/grades/$grade/$lesson"
              params={{ grade: qz._gradeSlug ?? "8", lesson: qz.slug }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:border-primary hover:shadow-[var(--shadow-elegant)] transition-all flex flex-col"
            >
              <div className="text-xs uppercase tracking-wider text-primary font-semibold">{bi(qz.grade)}</div>
              <h3 className="mt-2 font-display text-xl text-foreground leading-snug">{bi(qz.title)}</h3>
              <p className="mt-2 text-sm text-muted-foreground flex-1">{bi(qz.description)}</p>
              <div className="mt-4 text-xs text-muted-foreground">{qz.questions.length} {tr("questions")}</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-primary">
                {tr("start_quiz")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
