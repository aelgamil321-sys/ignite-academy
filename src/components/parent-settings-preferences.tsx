import { Loader2, Save, Settings2 } from "lucide-react";
import { PreferredLanguageField } from "@/components/preferred-language-field";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-config";
import {
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";

type ParentSettingsPreferencesProps = {
  preferredLanguage: Lang;
  onPreferredLanguageChange: (lang: Lang) => void;
  saving: boolean;
  onSave: () => void;
};

export function ParentSettingsPreferences({
  preferredLanguage,
  onPreferredLanguageChange,
  saving,
  onSave,
}: ParentSettingsPreferencesProps) {
  const { tr } = useI18n();

  return (
    <section className={PARENT_DASH_SECTION} aria-labelledby="parent-settings-preferences-heading">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background text-primary shadow-sm">
          <Settings2 className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 id="parent-settings-preferences-heading" className={PARENT_DASH_SECTION_TITLE}>
            {tr("parent_settings_preferences_title")}
          </h2>
          <p className={PARENT_DASH_SECTION_LEAD}>{tr("parent_settings_preferences_lead")}</p>
        </div>
      </div>

      <PreferredLanguageField value={preferredLanguage} onChange={onPreferredLanguageChange} />

      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {tr("student_saving")}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" aria-hidden />
            {tr("save_changes")}
          </>
        )}
      </button>
    </section>
  );
}
