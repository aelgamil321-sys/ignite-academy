import { Award, BarChart3, BookOpenCheck, ClipboardCheck, FileBarChart, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useI18n } from "@/lib/i18n";
import {
  formatPeerRank,
  performanceStatusLabel,
  type ParentPerformanceReport,
} from "@/lib/parent-performance-report";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";

const L = (en: string, ar: string) => ({ en, ar });

const chartConfig = {
  scorePct: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
};

function statusClass(status: ParentPerformanceReport["status"]): string {
  if (status === "excellent") return "bg-primary/15 text-primary border-primary/30";
  if (status === "good") return "bg-sky-500/10 text-sky-700 border-sky-500/25";
  if (status === "needs_support") return "bg-amber-500/10 text-amber-800 border-amber-500/25";
  return "bg-muted text-muted-foreground border-border";
}

function formatPct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export function ParentPerformanceReportCard({ report }: { report: ParentPerformanceReport }) {
  const { lang } = useI18n();
  const status = performanceStatusLabel(report.status, lang);

  const metrics = [
    {
      key: "avg",
      icon: BarChart3,
      labelAr: "متوسط درجات الاختبارات",
      labelEn: "Average quiz score",
      value: formatPct(report.averageQuizScorePct),
    },
    {
      key: "certs",
      icon: Award,
      labelAr: "الشهادات المكتسبة",
      labelEn: "Certificates earned",
      value: String(report.certificatesEarned),
    },
    {
      key: "lessons",
      icon: BookOpenCheck,
      labelAr: "الدروس المكتملة",
      labelEn: "Completed lessons",
      value: `${report.completedLessons} / ${report.totalLessons}`,
    },
    {
      key: "subs",
      icon: ClipboardCheck,
      labelAr: "إرسالات الاختبارات",
      labelEn: "Quiz submissions",
      value: String(report.totalQuizSubmissions),
    },
  ];

  const rankings = [
    {
      key: "grade",
      labelAr: "الترتيب في الصف",
      labelEn: "Rank in grade",
      contextAr: report.gradeLabelAr,
      contextEn: report.gradeLabelEn,
      rank: report.rankings.grade,
    },
    {
      key: "section",
      labelAr: "الترتيب في الشعبة",
      labelEn: "Rank in section",
      contextAr: sectionLabel(report.section, "ar"),
      contextEn: sectionLabel(report.section, "en"),
      rank: report.rankings.section,
    },
    {
      key: "group",
      labelAr: "الترتيب في المجموعة الإسلامية",
      labelEn: "Rank in Islamic group",
      contextAr: islamicGroupLabel(report.islamicGroup, "ar"),
      contextEn: islamicGroupLabel(report.islamicGroup, "en"),
      rank: report.rankings.islamicGroup,
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <FileBarChart className="h-5 w-5 text-primary mt-1" />
          <div>
            <h2 className="font-display text-xl text-foreground">
              {L("Performance Report", "تقرير الأداء")[lang]}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {L("Academic progress overview for your child.", "نظرة عامة على التقدّم الأكاديمي لابنك/ابنتك.")[
                lang
              ]}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex flex-col items-end rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(report.status)}`}
        >
          <span>{status.primary}</span>
          <span className="text-[10px] font-normal opacity-80">{status.secondary}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-4 border-b border-border pb-6">
        <StudentProfileAvatar
          profilePhotoPath={report.profilePhotoPath}
          alt={report.arabicName}
          className="h-20 w-20"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary mb-1">
              {L("Arabic Student Name", "اسم الطالب بالعربية")[lang]}
            </div>
            <div className="font-display text-2xl text-foreground leading-tight" dir="rtl">
              {report.arabicName}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {L("English Student Name", "اسم الطالب بالإنجليزية")[lang]}
            </div>
            <div className="text-sm font-medium text-foreground">{report.englishName}</div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
              {lang === "ar" ? report.gradeLabelAr : report.gradeLabelEn}
            </span>
            <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
              {sectionLabel(report.section, lang)}
            </span>
            <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
              {islamicGroupLabel(report.islamicGroup, lang)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.key}
              className="rounded-xl border border-border bg-muted/20 px-4 py-3"
            >
              <div className="flex items-center gap-2 text-primary mb-2">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium text-muted-foreground">
                  {lang === "ar" ? metric.labelAr : metric.labelEn}
                </span>
              </div>
              <div className="font-display text-2xl text-foreground">{metric.value}</div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base text-foreground">
            {L("Class ranking", "الترتيب الصفي")[lang]}
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {rankings.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-border bg-background px-4 py-3"
            >
              <div className="text-xs text-muted-foreground">
                {lang === "ar" ? item.labelAr : item.labelEn}
              </div>
              <div className="text-sm font-medium text-foreground mt-0.5">
                {lang === "ar" ? item.contextAr : item.contextEn}
              </div>
              <div className="font-display text-xl text-primary mt-2">
                {formatPeerRank(item.rank, lang)}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {L(
            "Rankings compare quiz averages only. Other students' names are not shown.",
            "يعتمد الترتيب على متوسط درجات الاختبارات فقط دون عرض أسماء الطلاب الآخرين.",
          )[lang]}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base text-foreground">
            {L("Quiz score trend", "اتجاه درجات الاختبارات")[lang]}
          </h3>
        </div>
        {report.quizTrend.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {L(
              "Quiz scores will appear here after the first submission.",
              "ستظهر درجات الاختبارات هنا بعد أول إرسال.",
            )[lang]}
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-[2.2/1] min-h-[220px] w-full">
            <LineChart data={report.quizTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(value: number) => `${value}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${value}%`, lang === "ar" ? "الدرجة" : "Score"]}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="scorePct"
                stroke="var(--color-scorePct)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-scorePct)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </section>
  );
}
