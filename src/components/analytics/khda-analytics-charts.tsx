import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { AdminTableScroll } from "@/components/admin-table-scroll";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type {
  AnalyticsGroupRow,
  AtRiskStudentRow,
  IslamicGroupCard,
  SectionLeaderboardRow,
  StudentLeaderboardRow,
} from "@/lib/admin-analytics";
import { useI18n, L } from "@/lib/i18n";
import { sectionLabel } from "@/lib/student-academics";
import { teachingSubjectLabel } from "@/lib/teacher-assignment-subject";
import { khdaRatingColor, khdaRatingFromScore } from "@/lib/khda-performance";
import type { KhdaDistributionBand, SubjectComparisonRow, TrendPoint } from "@/lib/khda-analytics-enrichment";
import { filterGroupRowsForDisplay } from "@/lib/khda-analytics-enrichment";
import {
  KhdaAnalyticsEmpty,
  KhdaChartCard,
  KhdaScoreBadge,
} from "@/components/analytics/khda-analytics-primitives";

const barChartConfig = { score: { label: "Score", color: "hsl(var(--primary))" } };
const trendChartConfig = { score: { label: "Average", color: "#2563EB" } };

export function KhdaDistributionChart({
  bands,
  totalStudents,
}: {
  bands: KhdaDistributionBand[];
  totalStudents: number;
}) {
  const { tr } = useI18n();
  const data = bands
    .filter((b) => b.studentCount > 0)
    .map((b) => ({
      name: `${tr("khda_rating_label")} ${b.rating}`,
      value: b.studentCount,
      rating: b.rating,
      pct: b.percentage,
    }));

  if (totalStudents === 0) {
    return (
      <KhdaChartCard title={tr("khda_distribution_title")}>
        <KhdaAnalyticsEmpty message={tr("khda_no_data")} />
      </KhdaChartCard>
    );
  }

  return (
    <KhdaChartCard title={tr("khda_distribution_title")} subtitle={tr("khda_distribution_subtitle")}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative mx-auto w-full max-w-[220px]">
          <ChartContainer config={{ count: { label: tr("khda_students"), color: "#2563EB" } }} className="mx-auto aspect-square max-h-[220px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.rating} fill={khdaRatingColor(entry.rating)} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-semibold tabular-nums">{totalStudents}</div>
            <div className="text-[10px] uppercase text-muted-foreground">{tr("khda_students")}</div>
          </div>
        </div>
        <ul className="space-y-2 text-xs">
          {bands.map((band) => (
            <li key={band.rating} className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: khdaRatingColor(band.rating) }} />
                {tr("khda_rating_label")} {band.rating} — {band.studentCount}
              </span>
              <span className="tabular-nums text-muted-foreground">{band.percentage}%</span>
            </li>
          ))}
        </ul>
      </div>
    </KhdaChartCard>
  );
}

export function KhdaGroupBarChart({ title, rows }: { title: string; rows: AnalyticsGroupRow[] }) {
  const { lang, tr } = useI18n();
  const display = filterGroupRowsForDisplay(rows).filter((r) => r.averageScorePct !== null);

  if (display.length === 0) {
    return (
      <KhdaChartCard title={title}>
        <KhdaAnalyticsEmpty message={tr("khda_no_data")} />
      </KhdaChartCard>
    );
  }

  const chartData = display.map((row) => ({
    label: L(row.labelEn, row.labelAr)[lang],
    score: row.averageScorePct!,
    fill: khdaRatingColor(khdaRatingFromScore(row.averageScorePct)!),
    students: row.studentCount,
  }));

  return (
    <KhdaChartCard title={title}>
      <ChartContainer config={barChartConfig} className="h-[240px] w-full min-w-0">
        <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={0} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </KhdaChartCard>
  );
}

export function KhdaTrendChart({ points }: { points: TrendPoint[] | null }) {
  const { lang, tr } = useI18n();
  if (!points || points.length === 0) {
    return (
      <KhdaChartCard title={tr("khda_trend_title")}>
        <KhdaAnalyticsEmpty message={tr("khda_trend_empty")} />
      </KhdaChartCard>
    );
  }

  const chartData = points.map((p) => ({
    label: lang === "ar" ? p.labelAr : p.labelEn,
    score: p.averageScorePct,
  }));

  return (
    <KhdaChartCard title={tr("khda_trend_title")}>
      <ChartContainer config={trendChartConfig} className="h-[220px] w-full min-w-0">
        <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ChartContainer>
    </KhdaChartCard>
  );
}

export function KhdaIslamicGroupPanel({ cards }: { cards: IslamicGroupCard[] }) {
  const { lang, tr } = useI18n();
  const visible = cards.filter((c) => c.studentCount > 0);
  if (visible.length === 0) {
    return (
      <KhdaChartCard title={tr("khda_islamic_group_title")}>
        <KhdaAnalyticsEmpty message={tr("khda_no_data")} />
      </KhdaChartCard>
    );
  }
  if (visible.length === 1) {
    return (
      <KhdaChartCard title={tr("khda_islamic_group_title")}>
        <KhdaAnalyticsEmpty message={tr("khda_single_group_only")} />
      </KhdaChartCard>
    );
  }

  return (
    <KhdaChartCard title={tr("khda_islamic_group_title")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((card) => (
          <div key={card.group} className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {L(card.labelEn, card.labelAr)[lang]}
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <KhdaScoreBadge scorePct={card.averageScorePct} />
              <span className="text-xs text-muted-foreground">
                {card.studentCount} {tr("khda_students")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </KhdaChartCard>
  );
}

export function KhdaSubjectComparisonPanel({ rows }: { rows: SubjectComparisonRow[] | null }) {
  const { lang, tr } = useI18n();
  if (!rows || rows.length === 0) {
    return (
      <KhdaChartCard title={tr("khda_subject_title")}>
        <KhdaAnalyticsEmpty message={tr("khda_subject_na")} />
      </KhdaChartCard>
    );
  }

  return (
    <KhdaChartCard title={tr("khda_subject_title")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.subject} className="rounded-lg border border-border/70 p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {teachingSubjectLabel(row.subject, lang)}
            </div>
            <div className="mt-2">
              <KhdaScoreBadge scorePct={row.averageScorePct} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {row.studentCount} {tr("khda_students")} · {row.submissionCount} {tr("khda_submissions")}
            </div>
          </div>
        ))}
      </div>
    </KhdaChartCard>
  );
}

export function KhdaTopStudentsTable({ rows }: { rows: StudentLeaderboardRow[] }) {
  const { lang, tr } = useI18n();
  return (
    <KhdaChartCard title={tr("khda_top_students_title")}>
      {rows.length === 0 ? (
        <KhdaAnalyticsEmpty message={tr("khda_no_data")} />
      ) : (
        <AdminTableScroll>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pe-3 text-start font-medium">{tr("khda_rank")}</th>
                <th className="pb-2 pe-3 text-start font-medium">{tr("khda_student")}</th>
                <th className="pb-2 pe-3 text-start font-medium">{tr("khda_grade")}</th>
                <th className="pb-2 pe-3 text-start font-medium">{tr("khda_section")}</th>
                <th className="pb-2 text-end font-medium">{tr("khda_score")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pe-3 tabular-nums">{row.rank}</td>
                  <td className="py-2.5 pe-3">
                    <div className="flex items-center gap-2">
                      <StudentProfileAvatar profilePhotoPath={row.profilePhotoPath} alt={row.englishName} className="h-8 w-8" />
                      <span className="font-medium">{row.englishName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pe-3">{L(row.gradeLabelEn, row.gradeLabelAr)[lang]}</td>
                  <td className="py-2.5 pe-3">{sectionLabel(row.section, lang)}</td>
                  <td className="py-2.5 text-end"><KhdaScoreBadge scorePct={row.averageScorePct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      )}
    </KhdaChartCard>
  );
}

export function KhdaTopSectionsChart({ rows }: { rows: SectionLeaderboardRow[] }) {
  const { lang, tr } = useI18n();
  if (rows.length === 0) {
    return (
      <KhdaChartCard title={tr("khda_top_sections_title")}>
        <KhdaAnalyticsEmpty message={tr("khda_no_data")} />
      </KhdaChartCard>
    );
  }

  const chartData = rows.map((row) => ({
    label: L(row.labelEn, row.labelAr)[lang],
    score: row.averageScorePct ?? 0,
    fill: khdaRatingColor(khdaRatingFromScore(row.averageScorePct)),
    rank: row.rank,
  }));

  return (
    <KhdaChartCard title={tr("khda_top_sections_title")}>
      <ChartContainer config={barChartConfig} className="h-[220px] w-full min-w-0">
        <BarChart layout="vertical" data={chartData} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="label" width={72} tickLine={false} axisLine={false} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </KhdaChartCard>
  );
}

export function KhdaNeedsAttentionTable({ rows }: { rows: AtRiskStudentRow[] }) {
  const { lang, tr } = useI18n();
  return (
    <KhdaChartCard title={tr("khda_needs_attention_title")} subtitle={tr("khda_needs_attention_subtitle")}>
      {rows.length === 0 ? (
        <KhdaAnalyticsEmpty message={tr("khda_needs_attention_empty")} />
      ) : (
        <AdminTableScroll>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pe-3 text-start font-medium">{tr("khda_student")}</th>
                <th className="pb-2 pe-3 text-start font-medium">{tr("khda_grade")}</th>
                <th className="pb-2 pe-3 text-start font-medium">{tr("khda_section")}</th>
                <th className="pb-2 text-end font-medium">{tr("khda_score")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row) => (
                <tr key={row.userId} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pe-3 font-medium">{row.nameEn}</td>
                  <td className="py-2.5 pe-3">{L(row.gradeLabelEn, row.gradeLabelAr)[lang]}</td>
                  <td className="py-2.5 pe-3">{sectionLabel(row.section, lang)}</td>
                  <td className="py-2.5 text-end"><KhdaScoreBadge scorePct={row.averageScorePct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      )}
    </KhdaChartCard>
  );
}
