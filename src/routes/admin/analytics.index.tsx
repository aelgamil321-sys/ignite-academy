import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { grades } from "@/lib/curriculum";
import {useI18n, L } from "@/lib/i18n";
import {
  ANALYTICS_UNSET_KEY,
  fetchAdminAnalytics,
  type AdminAnalyticsSnapshot,
  type AnalyticsFilters,
  type AnalyticsGroupRow,
  type AtRiskStudentRow,
  type IslamicGroupCard,
  type SectionLeaderboardRow,
  type StudentLeaderboardRow,
} from "@/lib/admin-analytics";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  islamicGroupLabel,
  sectionLabel,
} from "@/lib/student-academics";


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

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-primary text-primary-foreground";
  if (rank === 2) return "bg-primary/20 text-primary";
  if (rank === 3) return "bg-muted text-foreground";
  return "bg-background border border-border text-muted-foreground";
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
        <p className="text-sm text-muted-foreground">
          {L("No data for current filters.", "لا توجد بيانات للفلاتر الحالية.")[lang]}
        </p>
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
                  {L(row.labelEn, row.labelAr)[lang]}
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

function LeadingInsightsBanner({
  data,
  lang,
}: {
  data: AdminAnalyticsSnapshot;
  lang: "en" | "ar";
}) {
  const items = [
    {
      key: "grade",
      label: L("Best grade", "أفضل صف")[lang],
      value: data.leading.grade,
    },
    {
      key: "section",
      label: L("Best section", "أفضل شعبة")[lang],
      value: data.leading.section,
    },
    {
      key: "group",
      label: L("Best Islamic group", "أفضل مجموعة إسلامية")[lang],
      value: data.leading.islamicGroup,
    },
  ];

  const hasAny = items.some((item) => item.value);

  if (!hasAny) return null;

  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg text-foreground">
          {L("Currently leading", "المتصدّر حاليًا")[lang]}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-border bg-background/80 px-4 py-3"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</div>
            <div className="mt-1 font-display text-lg text-foreground leading-tight">
              {item.value ? L(item.value.labelEn, item.value.labelAr)[lang] : "—"}
            </div>
            {item.value ? (
              <div className="mt-1 text-sm font-semibold text-primary">
                {formatPct(item.value.averageScorePct)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function IslamicGroupComparison({
  cards,
  lang,
}: {
  cards: IslamicGroupCard[];
  lang: "en" | "ar";
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">
          {L("Islamic group comparison", "مقارنة المجموعات الإسلامية")[lang]}
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.group}
            className="rounded-xl border border-border bg-muted/20 p-5"
          >
            <div className="text-xs uppercase tracking-wide text-primary mb-1">
              {L(card.labelEn, card.labelAr)[lang]}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">{L("Students", "الطلاب")[lang]}</div>
                <div className="font-display text-xl text-foreground mt-0.5">{card.studentCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {L("Avg. score", "متوسط الدرجة")[lang]}
                </div>
                <div className="font-display text-xl text-primary mt-0.5">
                  {formatPct(card.averageScorePct)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  {L("Certificates", "الشهادات")[lang]}
                </div>
                <div className="font-display text-xl text-foreground mt-0.5">
                  {card.certificatesEarned}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopStudentsTable({
  rows,
  lang,
}: {
  rows: StudentLeaderboardRow[];
  lang: "en" | "ar";
}) {
  const T = {
    title: L("Top students", "أفضل الطلاب")[lang],
    empty: L("No ranked students for current filters.", "لا يوجد طلاب مصنّفون للفلاتر الحالية.")[lang],
    rank: L("Rank", "الترتيب")[lang],
    student: L("Student", "الطالب")[lang],
    grade: L("Grade", "الصف")[lang],
    section: L("Section", "الشعبة")[lang],
    islamicGroup: L("Islamic Group", "المجموعة الإسلامية")[lang],
    avgScore: L("Avg. score", "متوسط الدرجة")[lang],
    certificates: L("Certificates", "الشهادات")[lang],
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">{T.title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{T.empty}</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pe-3 font-medium w-12">{T.rank}</th>
                <th className="pb-3 pe-4 font-medium">{T.student}</th>
                <th className="pb-3 pe-4 font-medium">{T.grade}</th>
                <th className="pb-3 pe-4 font-medium">{T.section}</th>
                <th className="pb-3 pe-4 font-medium">{T.islamicGroup}</th>
                <th className="pb-3 pe-4 font-medium text-end">{T.avgScore}</th>
                <th className="pb-3 font-medium text-end">{T.certificates}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pe-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(row.rank)}`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 pe-4">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <StudentProfileAvatar
                        profilePhotoPath={row.profilePhotoPath}
                        alt={row.arabicName}
                        className="h-10 w-10"
                      />
                      <div>
                        <div className="font-medium text-foreground" dir="rtl">
                          {row.arabicName}
                        </div>
                        <div className="text-xs text-muted-foreground">{row.englishName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {L(row.gradeLabelEn, row.gradeLabelAr)[lang]}
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {sectionLabel(row.section, lang)}
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {islamicGroupLabel(row.islamicGroup, lang)}
                  </td>
                  <td className="py-3 pe-4 text-end font-semibold text-primary">
                    {formatPct(row.averageScorePct)}
                  </td>
                  <td className="py-3 text-end text-muted-foreground">{row.certificatesEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TopSectionsTable({
  rows,
  lang,
}: {
  rows: SectionLeaderboardRow[];
  lang: "en" | "ar";
}) {
  const T = {
    title: L("Top sections", "أفضل الشعب")[lang],
    empty: L("No ranked sections for current filters.", "لا توجد شعب مصنّفة للفلاتر الحالية.")[lang],
    rank: L("Rank", "الترتيب")[lang],
    section: L("Section", "الشعبة")[lang],
    students: L("Students", "الطلاب")[lang],
    avgScore: L("Avg. score", "متوسط الدرجة")[lang],
    certificates: L("Certificates", "الشهادات")[lang],
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 mb-4">
        <Medal className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">{T.title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{T.empty}</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pe-3 font-medium w-12">{T.rank}</th>
                <th className="pb-3 pe-4 font-medium">{T.section}</th>
                <th className="pb-3 pe-4 font-medium text-end">{T.students}</th>
                <th className="pb-3 pe-4 font-medium text-end">{T.avgScore}</th>
                <th className="pb-3 font-medium text-end">{T.certificates}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.section ?? row.rank} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pe-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(row.rank)}`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 pe-4 font-medium text-foreground">
                    {L(row.labelEn, row.labelAr)[lang]}
                  </td>
                  <td className="py-3 pe-4 text-end text-foreground">{row.studentCount}</td>
                  <td className="py-3 pe-4 text-end font-semibold text-primary">
                    {formatPct(row.averageScorePct)}
                  </td>
                  <td className="py-3 text-end text-muted-foreground">{row.certificatesEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AtRiskStudentsTable({
  rows,
  lang,
}: {
  rows: AtRiskStudentRow[];
  lang: "en" | "ar";
}) {
  const T = {
    title: L("At-risk students", "طلاب يحتاجون متابعة")[lang],
    subtitle: L(
      "Average score below 60% or no certificates earned.",
      "متوسط الدرجة أقل من 60٪ أو لم يحصلوا على شهادات.",
    )[lang],
    empty: L("No at-risk students for current filters.", "لا يوجد طلاب معرّضون للخطر للفلاتر الحالية.")[lang],
    name: L("Name", "الاسم")[lang],
    grade: L("Grade", "الصف")[lang],
    section: L("Section", "الشعبة")[lang],
    islamicGroup: L("Islamic Group", "المجموعة الإسلامية")[lang],
    avgScore: L("Avg. score", "متوسط الدرجة")[lang],
  };

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display text-lg text-foreground">{T.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{T.subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{T.empty}</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pe-4 font-medium">{T.name}</th>
                <th className="pb-3 pe-4 font-medium">{T.grade}</th>
                <th className="pb-3 pe-4 font-medium">{T.section}</th>
                <th className="pb-3 pe-4 font-medium">{T.islamicGroup}</th>
                <th className="pb-3 font-medium text-end">{T.avgScore}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pe-4">
                    <div className="font-medium text-foreground">
                      {L(row.nameEn, row.nameAr)[lang]}
                    </div>
                    {lang === "ar" && row.nameEn !== row.nameAr ? (
                      <div className="text-xs text-muted-foreground">{row.nameEn}</div>
                    ) : null}
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {L(row.gradeLabelEn, row.gradeLabelAr)[lang]}
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {sectionLabel(row.section, lang)}
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {islamicGroupLabel(row.islamicGroup, lang)}
                  </td>
                  <td className="py-3 text-end font-semibold text-amber-700">
                    {formatPct(row.averageScorePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AdminAnalyticsPage() {
  const { lang, bi } = useI18n();
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
                  {bi(grade.name)}
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
          <LeadingInsightsBanner data={data} lang={lang} />

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

          <IslamicGroupComparison cards={data.islamicGroupCards} lang={lang} />

          <div className="grid gap-6 xl:grid-cols-2">
            <TopStudentsTable rows={data.topStudents} lang={lang} />
            <TopSectionsTable rows={data.topSections} lang={lang} />
          </div>

          <AtRiskStudentsTable rows={data.atRiskStudents} lang={lang} />

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
