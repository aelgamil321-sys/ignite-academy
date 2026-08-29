import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";
import type { ParentGuide } from "@/lib/extras";
import {
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
} from "@/lib/parent-dashboard-ui";

type ParentGuideCardProps = {
  guide: ParentGuide & { createdAt?: number };
  detailTo?: "/parent/guides/$slug" | "/parent/$slug";
};

export function ParentGuideCard({
  guide,
  detailTo = "/parent/guides/$slug",
}: ParentGuideCardProps) {
  const { bi, tr, dir, lang } = useI18n();
  const dateLabel =
    guide.createdAt != null
      ? new Date(guide.createdAt).toLocaleDateString(localeForFormatting(lang), {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  return (
    <Link
      to={detailTo}
      params={{ slug: guide.slug }}
      className={`group flex h-full flex-col ${PARENT_DASH_SECTION} transition-colors hover:border-primary/35`}
    >
      <h3 className="font-display text-base font-semibold leading-snug text-foreground group-hover:text-primary sm:text-lg">
        {bi(guide.title)}
      </h3>
      {guide.excerpt.en || guide.excerpt.ar ? (
        <p className={`mt-2 flex-1 text-sm ${PARENT_DASH_SECTION_LEAD} line-clamp-3`}>
          {bi(guide.excerpt)}
        </p>
      ) : null}
      {dateLabel ? (
        <p className="mt-2 text-[11px] text-foreground/55">{dateLabel}</p>
      ) : null}
      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
        {tr("read_more")}
        <ArrowRight
          className={`h-3.5 w-3.5 transition-transform ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`}
        />
      </div>
    </Link>
  );
}
