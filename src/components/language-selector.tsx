import { Check, Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANG_OPTIONS } from "@/lib/i18n-config";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const headerPillBase =
  "inline-flex items-center justify-center rounded-lg border border-border/80 bg-card text-foreground shadow-[var(--shadow-soft)] transition-all hover:border-primary/45 hover:text-primary hover:shadow-[var(--shadow-elegant)]";

export function LanguageSelector({ className }: { className?: string }) {
  const { lang, setLang, tr } = useI18n();
  const current = LANG_OPTIONS.find((option) => option.code === lang) ?? LANG_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={tr("select_language")}
        className={cn(
          headerPillBase,
          "h-8 shrink-0 gap-1.5 px-2 text-[11px] font-semibold sm:px-2.5",
          className,
        )}
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="max-w-[5.5rem] truncate sm:max-w-none">{current.nativeLabel}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {LANG_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => setLang(option.code)}
            className="flex items-center justify-between gap-3"
          >
            <span className="font-medium">{option.nativeLabel}</span>
            {lang === option.code ? <Check className="h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
