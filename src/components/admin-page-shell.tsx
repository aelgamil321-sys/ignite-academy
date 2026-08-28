import type { ReactNode } from "react";
import { AdminTopBar } from "@/components/admin-top-bar";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

export function AdminPageShell({
  eyebrow,
  title,
  lead,
  crumbs,
  profile,
  onLogout,
  hidePageHeader = false,
  fullWidthContent = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  crumbs?: Crumb[];
  profile: {
    fullName: string;
    email: string;
    profilePhotoPath: string | null;
  };
  onLogout: () => void;
  hidePageHeader?: boolean;
  fullWidthContent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex min-w-0 flex-col bg-background">
      <AdminTopBar profile={profile} onLogout={onLogout} />
      <main className="min-w-0 flex-1">
        {!hidePageHeader ? (
          <section className="border-b border-border bg-gradient-to-b from-cream/80 to-background">
            <div className="container-page py-6 sm:py-8 md:py-10">
              {crumbs && crumbs.length > 0 ? (
                <div className="mb-4">
                  <Breadcrumbs items={crumbs} />
                </div>
              ) : null}
              {eyebrow ? (
                <div className="text-xs uppercase tracking-[0.22em] text-primary mb-2">{eyebrow}</div>
              ) : null}
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground break-words">
                {title}
              </h1>
              {lead ? (
                <p className="mt-3 max-w-3xl text-muted-foreground text-sm sm:text-base md:text-lg break-words">
                  {lead}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
        <section className={fullWidthContent ? "min-w-0" : "container-page min-w-0 py-6 sm:py-8 md:py-10"}>
          {children}
        </section>
      </main>
    </div>
  );
}
