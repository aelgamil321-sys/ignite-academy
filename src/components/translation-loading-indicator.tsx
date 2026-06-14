import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Small indicator shown while lesson/content translation is in progress. */
export function TranslationLoadingIndicator({ className }: { className?: string }) {
  const { contentTranslating, tr } = useI18n();
  if (contentTranslating <= 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-[var(--shadow-soft)]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-3 w-3 animate-spin text-primary" />
      <span>{tr("content_translating")}</span>
    </div>
  );
}
