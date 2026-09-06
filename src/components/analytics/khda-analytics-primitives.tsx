import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KHDA_RATING_BANDS,
  formatKhdaPct,
  khdaRatingColor,
  khdaRatingFromScore,
  khdaRatingLabel,
  quantitativeDescriptor,
} from "@/lib/khda-performance";
import { useI18n } from "@/lib/i18n";

export function KhdaAnalyticsLoading() {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {tr("khda_analytics_loading")}
    </div>
  );
}

export function KhdaAnalyticsEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function KhdaChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function KhdaKpiCard({
  label,
  value,
  scorePct,
  footnote,
  proportionDescriptor = false,
}: {
  label: string;
  value: string;
  scorePct?: number | null;
  footnote?: string | null;
  /** When true, show quantitative proportion descriptor (not KHDA) instead of KHDA rating. */
  proportionDescriptor?: boolean;
}) {
  const { lang, tr } = useI18n();
  const rating =
    !proportionDescriptor && scorePct !== undefined ? khdaRatingFromScore(scorePct) : null;
  const ratingLabel = rating !== null ? khdaRatingLabel(rating, lang) : null;
  const qDesc =
    proportionDescriptor && scorePct !== undefined && scorePct !== null
      ? quantitativeDescriptor(scorePct, lang)
      : null;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
        {rating !== null ? (
          <span
            className="mb-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: khdaRatingColor(rating),
              color: KHDA_RATING_BANDS[rating - 1].textColor,
            }}
          >
            {ratingLabel}
          </span>
        ) : null}
      </div>
      {rating !== null ? (
        <div className="mt-1 text-xs text-muted-foreground">
          {tr("khda_rating_label")} {rating}
        </div>
      ) : null}
      {qDesc ? <div className="mt-1 text-xs text-muted-foreground">{qDesc}</div> : null}
      {footnote ? <div className="mt-1 text-xs text-muted-foreground">{footnote}</div> : null}
    </div>
  );
}

export function KhdaScoreBadge({ scorePct }: { scorePct: number | null }) {
  const { lang, tr } = useI18n();
  if (scorePct === null) return <span className="text-muted-foreground">—</span>;
  const rating = khdaRatingFromScore(scorePct);
  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <span className="font-semibold tabular-nums text-foreground">{formatKhdaPct(scorePct)}</span>
      {rating !== null ? (
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: khdaRatingColor(rating),
            color: KHDA_RATING_BANDS[rating - 1].textColor,
          }}
          title={`${tr("khda_rating_label")} ${rating}: ${khdaRatingLabel(rating, lang)}`}
        >
          {khdaRatingLabel(rating, lang)} ({rating})
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground">{tr("khda_no_data")}</span>
      )}
    </div>
  );
}

export function KhdaPerformanceLegend({ compact }: { compact?: boolean }) {
  const { lang } = useI18n();
  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 lg:grid-cols-4")}>
      {KHDA_RATING_BANDS.map((band) => (
        <div key={band.rating} className="flex items-center gap-2 text-[11px]">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: band.color }}
            aria-hidden
          />
          <span className="text-muted-foreground">
            {band.rating}. {lang === "ar" ? band.labelAr : band.labelEn} ({band.min}–{band.max}%)
          </span>
        </div>
      ))}
    </div>
  );
}

export function KhdaInsightStrip({
  insights,
}: {
  insights: Array<{ id: string; templateKey: string; vars: Record<string, string> }>;
}) {
  const { tr, trf } = useI18n();
  if (insights.length === 0) return null;
  return (
    <section className="rounded-xl border border-border/80 bg-muted/30 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {tr("khda_insights_title")}
      </h3>
      <ul className="space-y-1.5 text-sm text-foreground">
        {insights.map((item) => (
          <li key={item.id} className="leading-snug">
            {trf(item.templateKey, item.vars)}
          </li>
        ))}
      </ul>
    </section>
  );
}
