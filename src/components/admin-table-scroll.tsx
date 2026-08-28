import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Contained horizontal scroll for admin data tables — avoids page-level overflow. */
export function AdminTableScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-full min-w-0 overflow-x-auto overscroll-x-contain", className)}>
      {children}
    </div>
  );
}
