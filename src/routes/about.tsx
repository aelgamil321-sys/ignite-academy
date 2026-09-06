import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { Sparkles, Compass, Heart } from "lucide-react";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    publicPageHead({
      title: "About — Ignite Islamic Academy",
      description:
        "Learn about Ignite Islamic Academy at Ignite School — bilingual Islamic education, mission, vision and values for KG through Grade 12 in Dubai, UAE.",
      path: "/about",
      ogTitle: "About — Ignite Islamic Academy",
      ogDescription:
        "Mission, vision and values for bilingual Islamic education from KG through Grade 12 at Ignite School.",
    }),
  component: AboutPage,
});

function AboutPage() {
  const { tr, locale } = useI18n();
  const cards = [
    { icon: Sparkles, t: tr("about_mission_t"), d: tr("about_mission_d") },
    { icon: Compass, t: tr("about_vision_t"), d: tr("about_vision_d") },
    { icon: Heart, t: tr("about_values_t"), d: tr("about_values_d") },
  ];
  return (
    <PageShell
      eyebrow={tr("nav_about")}
      title={tr("about_title")}
      lead={tr("about_lead")}
      crumbs={[{ label: tr("nav_about") }]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.t} className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <c.icon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl text-foreground">{c.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.d}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
