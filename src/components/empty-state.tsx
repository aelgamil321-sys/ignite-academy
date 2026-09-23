import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { GhirasWatermark } from "@/components/brand/ghiras-watermark";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12",
        className,
      )}
    >
      <GhirasWatermark variant="section" position="bottom-end" size="sm" />
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <div className="relative z-10 font-display text-lg text-foreground">{title}</div>
      {description && <p className="relative z-10 mt-1.5 text-sm text-muted-foreground max-w-md">{description}</p>}
      {action && <div className="relative z-10 mt-4">{action}</div>}
    </div>
  );
}
