import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { needsDynamicTranslation } from "@/lib/translate-content";
import { cn } from "@/lib/utils";

/** Small indicator shown while lesson/content translation is in progress. */
export function TranslationLoadingIndicator({ className }: { className?: string }) {
  const { contentTranslating, translationUnavailable, tr, lang } = useI18n();
  const showSpinner = contentTranslating > 0 && needsDynamicTranslation(lang);
  const showUnavailable = translationUnavailable && needsDynamicTranslation(lang);

  if (!showSpinner && !showUnavailable) return null;

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      {showSpinner && (
        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-[var(--shadow-soft)]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>{tr("content_translating")}</span>
        </div>
      )}
      {showUnavailable && !showSpinner && (
        <p
          className="max-w-[12rem] text-end text-[10px] leading-snug text-muted-foreground"
          role="note"
        >
          {tr("content_translation_unavailable")}
        </p>
      )}
    </div>
  );
}

/** Inline shimmer while a field is waiting for dynamic translation. */
export function TranslatedContentShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { contentTranslating, lang } = useI18n();
  const pending = contentTranslating > 0 && needsDynamicTranslation(lang);

  return (
    <div
      className={cn(
        pending && "animate-pulse [animation-duration:1.4s] opacity-90",
        className,
      )}
    >
      {children}
    </div>
  );
}
