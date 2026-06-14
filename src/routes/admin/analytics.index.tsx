import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Award, BarChart3, ClipboardCheck, GraduationCap, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { grades } from "@/lib/curriculum";
import { useI18n } from "@/lib/i18n";
import {
  ANALYTICS_UNSET_KEY,
  fetchAdminAnalytics,
  type AdminAnalyticsSnapshot,
  type AnalyticsFilters,
  type AnalyticsGroupRow,
} from "@/lib/admin-analytics";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  islamicGroupLabel,
  sectionLabel,
} from "@/lib/student-academics";

const L = (en: string, ar: string) => ({ en, ar });

const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

export const Route = createFileRoute("/admin/analytics/")({
  head: () => ({
    meta: [
      { title: "Analytics — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAnalyticsPage,
});

function formatPct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function AnalyticsTable({
  title,
  rows,
  lang,
}: {
  title: string;
  rows: AnalyticsGroupRow[];
  lang: "en" | "ar";
}) {
  const headers = {
    group: L("Group", "المجموعة")[lang],
    students: L("Students", "الطلاب")[lang],
    avgScore: L("Avg. quiz score", "متوسط درجات الاختبار")[lang],
    submissions: L("Submissions", "الإرسالات")[lang],
    certificates: L("Certificates", "الشهادات")[lang],
  };

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-lg text-foreground mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground">{L("No data for current filters.", "لا توجد بيانات للفلاتر الحالية.")[lang]}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h3 className="font-display text-lg text-foreground mb-4">{title}</h3>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-3 pe-4 font-medium">{headers.group}</th>
              <th className="pb-3 pe-4 font-medium text-end">{headers.students}</th>
              <th className="pb-3 pe-4 font-medium text-end">{headers.avgScore}</th>
              <th className="pb-3 pe-4 font-medium text-end">{headers.submissions}</th>
              <th className="pb-3 font-medium text-end">{headers.certificates}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/70 last:border-0">
                <td className="py-3 pe-4 font-medium text-foreground">
                  {lang === "ar" ? row.labelAr : row.labelEn}
                </td>
                <td className="py-3 pe-4 text-end text-foreground">{row.studentCount}</td>
                <td className="py-3 pe-4 text-end font-semibold text-primary">
                  {formatPct(row.averageScorePct)}
                </td>
                <td className="py-3 pe-4 text-end text-muted-foreground">{row.submissionCount}</td>
                <td className="py-3 text-end text-muted-foreground">{row.certificatesEarned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminAnalyticsPage() {
  const { lang } = useI18n();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    grade: "",
    section: "",
    islamicGroup: "",
  });
  const [data, setData] = useState<AdminAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminAnalytics(filters);
    if (result.error) {
      toast.error(result.error);
      setData(null);
    } else {
      setData(result.data);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const T = {
    filters: L("Filters", "الفلاتر")[lang],
    grade: L("Grade", "الصف")[lang],
    section: L("Section", "الشعبة")[lang],
    islamicGroup: L("Islamic Group", "المجموعة الإسلامية")[lang],
    all: L("All", "الكل")[lang],
    notSet: L("Not set", "غير محدد")[lang],
    students: L("Students", "الطلاب")[lang],
    avgScore: L("Average quiz score", "متوسط درجات الاختبار")[lang],
    submissions: L("Quiz submissions", "إرسالات الاختبارات")[lang],
    certificates: L("Certificates earned", "الشهادات المكتسبة")[lang],
    byGrade: L("Performance by grade", "الأداء حسب الصف")[lang],
    bySection: L("Performance by section", "الأداء حسب الشعبة")[lang],
    byIslamicGroup: L("Performance by Islamic group", "الأداء حسب المجموعة الإسلامية")[lang],
    loading: L("Loading analytics…", "جارٍ تحميل التحليلات…")[lang],
  };

  const summaryCards = data
    ? [
        { key: "students", icon: Users, label: T.students, value: String(data.summary.studentCount) },
        {
          key: "avg",
          icon: BarChart3,
          label: T.avgScore,
          value: formatPct(data.summary.averageScorePct),
        },
        {
          key: "subs",
          icon: ClipboardCheck,
          label: T.submissions,
          value: String(data.summary.submissionCount),
        },
        {
          key: "certs",
          icon: Award,
          label: T.certificates,
          value: String(data.summary.certificateCount),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-foreground">{T.filters}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{T.grade}</label>
            <select
              value={filters.grade}
              onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value }))}
              className={selectClass}
            >
              <option value="">{T.all}</option>
              {grades.map((grade) => (
                <option key={grade.slug} value={grade.slug}>
                  {grade.name[lang]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{T.section}</label>
            <select
              value={filters.section}
              onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))}
              className={selectClass}
            >
              <option value="">{T.all}</option>
              <option value={ANALYTICS_UNSET_KEY}>{T.notSet}</option>
              {STUDENT_SECTIONS.map((section) => (
                <option key={section} value={section}>
                  {sectionLabel(section, lang)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{T.islamicGroup}</label>
            <select
              value={filters.islamicGroup}
              onChange={(e) => setFilters((prev) => ({ ...prev, islamicGroup: e.target.value }))}
              className={selectClass}
            >
              <option value="">{T.all}</option>
              <option value={ANALYTICS_UNSET_KEY}>{T.notSet}</option>
              {ISLAMIC_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {islamicGroupLabel(group, lang)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
          {T.loading}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-display text-2xl text-foreground">{card.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-1">
            <AnalyticsTable title={T.byGrade} rows={data.byGrade} lang={lang} />
            <AnalyticsTable title={T.bySection} rows={data.bySection} lang={lang} />
            <AnalyticsTable title={T.byIslamicGroup} rows={data.byIslamicGroup} lang={lang} />
          </div>
        </>
      ) : null}
    </div>
  );
}
