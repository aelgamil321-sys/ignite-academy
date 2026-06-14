import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";

/** Global chrome: header, footer, and Ask Ignite widget on every page. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      {children}
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}
