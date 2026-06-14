import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

export function PageShell({
  eyebrow, title, lead, crumbs, children,
}: { eyebrow?: string; title: string; lead?: string; crumbs?: Crumb[]; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-cream to-background border-b border-border">
          <div className="container-page py-12">
            {crumbs && crumbs.length > 0 && <div className="mb-5"><Breadcrumbs items={crumbs} /></div>}
            {eyebrow && <div className="text-xs uppercase tracking-[0.22em] text-primary mb-3">{eyebrow}</div>}
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground">{title}</h1>
            {lead && <p className="mt-4 max-w-2xl text-muted-foreground text-lg">{lead}</p>}
          </div>
        </section>
        <section className="container-page py-14">{children}</section>
      </main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}
