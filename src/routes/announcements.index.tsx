import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { Megaphone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAllAnnouncements } from "@/lib/cms";
import { Calendar, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/announcements/")({
  head: () => ({
    meta: [
      { title: "Announcements — Ignite Islamic Academy" },
      { name: "description", content: "Latest news, events, exam schedules and competition updates from Ignite Islamic Academy." },
      { property: "og:title", content: "Announcements — Ignite Islamic Academy" },
      { property: "og:description", content: "School news, events and competitions from Ignite Islamic Academy." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/announcements" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/announcements" }],
  }),
  component: AnnouncementsIndex,
});

function AnnouncementsIndex() {
  const { tr, lang, dir } = useI18n();
  const announcements = useAllAnnouncements();
  return (
    <PageShell eyebrow={tr("nav_announcements")} title={tr("ann_page_title")} lead={tr("ann_page_lead")} crumbs={[{ label: tr("nav_announcements") }]}>
      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title={tr("empty_articles")} />
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {announcements.map((a) => (
          <Link key={a.slug} to="/announcements/$slug" params={{ slug: a.slug }}
            className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:border-primary hover:shadow-[var(--shadow-elegant)] transition-all flex flex-col">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" /> {a.date}
              <span className="ms-auto rounded-full bg-gold/20 text-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{a.tag[locale]}</span>
            </div>
            <h3 className="mt-3 font-display text-xl text-foreground leading-snug">{a.title[locale]}</h3>
            <p className="mt-2 text-sm text-muted-foreground flex-1">{a.excerpt[locale]}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-primary">
              {tr("read_more")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            </div>
          </Link>
        ))}
      </div>
      )}
    </PageShell>
  );
}
