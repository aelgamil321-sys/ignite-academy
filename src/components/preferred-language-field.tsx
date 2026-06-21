import { LANG_OPTIONS, type Lang } from "@/lib/i18n-config";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  value: Lang;
  onChange: (lang: Lang) => void;
  required?: boolean;
  className?: string;
  id?: string;
};

/** Signup / profile language picker with native script labels. */
export function PreferredLanguageField({ value, onChange, required, className, id = "preferred_language" }: Props) {
  const { tr } = useI18n();

  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {tr("auth_preferred_language")}
        {required ? " *" : ""}
      </label>
      <select
        id={id}
        name="preferred_language"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value as Lang)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
      >
        {LANG_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeLabel}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{tr("auth_preferred_language_hint")}</p>
    </div>
  );
}
