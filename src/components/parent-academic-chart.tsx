import { BarChart3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useI18n, L } from "@/lib/i18n";
import type { ParentPerformanceReport } from "@/lib/parent-performance-report";

const chartConfig = {
  scorePct: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
};

export function ParentAcademicChart({ report }: { report: ParentPerformanceReport }) {
  const { lang } = useI18n();
  const trend = report.quizTrend;
  const singlePoint = trend.length === 1;
  const currentScore = trend.length > 0 ? trend[trend.length - 1].scorePct : null;

  return (
    <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl text-foreground">
              {L("Academic Performance", "الأداء الأكاديمي")[lang]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {L("Quiz score trend over time.", "اتجاه درجات الاختبارات عبر الزمن.")[lang]}
            </p>
          </div>
        </div>
        {currentScore !== null && (
          <div className="rounded-xl border border-primary/25 bg-primary/8 px-4 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {L("Current score", "الدرجة الحالية")[lang]}
            </div>
            <div className="font-display text-2xl text-primary">{currentScore}%</div>
          </div>
        )}
      </div>

      {trend.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm italic text-muted-foreground">
          {L(
            "Quiz scores will appear here after the first submission.",
            "ستظهر درجات الاختبارات هنا بعد أول إرسال.",
          )[lang]}
        </p>
      ) : (
        <div className="space-y-3">
          {singlePoint && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-foreground">
              {L(
                "Performance trends will appear after additional assessments are added.",
                "سيظهر تطور الأداء بعد إضافة اختبارات إضافية",
              )[lang]}
            </p>
          )}
          <ChartContainer config={chartConfig} className="aspect-[2.4/1] min-h-[200px] w-full">
            <AreaChart data={trend} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="parentScoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-scorePct)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-scorePct)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
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
              <Area
                type="monotone"
                dataKey="scorePct"
                stroke="var(--color-scorePct)"
                strokeWidth={2.5}
                fill="url(#parentScoreFill)"
                dot={{ r: singlePoint ? 5 : 3, fill: "var(--color-scorePct)", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </section>
  );
}
