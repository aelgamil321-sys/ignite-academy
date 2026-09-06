/**
 * Reusable missing-translation detection and merge helpers (OpenAI-free).
 *
 * ## translateOnly workflow (Phase 4.3D)
 *
 * Use this module to detect gaps, then call AI separately with `translateOnly: true`
 * (see `generate-lesson-from-file.server.ts` and `lesson-ai-generate-panel.tsx`).
 *
 * 1. **Load** entity row and resolve stored text via `readLocalizedFieldWithLegacyFallback`.
 * 2. **Scan** with the appropriate `collect*MissingLocalizedSlots` helper.
 * 3. **Translate** only when `complete === false`; pass `translateOnly: true` so source
 *    en/ar (and any existing fr/de/ur/zh) are never regenerated from scratch.
 * 4. **Merge** AI patches with `mergeMissingLocalizedSlotsOnly` — never overwrite
 *    non-empty, script-valid slots.
 * 5. **Persist** dual-write jsonb + legacy en/ar via `prepareLocalizedDualWritePayload`.
 *
 * @example
 * ```ts
 * const title = readLocalizedFieldWithLegacyFallback(row.title, row.title_en, row.title_ar);
 * const report = collectAssignmentMissingLocalizedSlots({ title, instructions });
 * if (!report.complete) {
 *   // await translateEducationalBi(...) or lesson AI with translateOnly: true
 *   const merged = mergeMissingLocalizedSlotsOnly(title, aiPatch);
 *   await supabase.from("assignments").update(
 *     localizedDualWriteColumnSet("title", merged),
 *   );
 * }
 * ```
 */

import type { Bi } from "@/lib/curriculum";
import {
  parseLocalizedText,
  serializeLocalizedText,
  type LocalizedText,
} from "@/lib/lesson-localized";
import {
  collectAssignmentMissingLocalizedSlots,
  collectNotificationMissingLocalizedSlots,
  collectWeeklyPlanLabelMissingLocalizedSlots,
  collectLessonMissingLocalizedSlots,
  mergeMissingLocalizedSlotsOnly,
  readLocalizedFieldWithLegacyFallback,
  type LocalizedCompletenessReport,
  type MissingLocalizedSlot,
} from "@/lib/localized-content-completeness";

export type { LocalizedCompletenessReport, MissingLocalizedSlot };

export {
  collectAssignmentMissingLocalizedSlots,
  collectNotificationMissingLocalizedSlots,
  collectWeeklyPlanLabelMissingLocalizedSlots,
  collectLessonMissingLocalizedSlots,
  mergeMissingLocalizedSlotsOnly,
  readLocalizedFieldWithLegacyFallback,
};

/** Merge partial en/ar form input onto existing jsonb (preserves fr/de/ur/zh). */
export function mergeLocalizedWithLegacyEnAr(
  existingJsonb: unknown,
  legacyEn: string | null | undefined,
  legacyAr: string | null | undefined,
): LocalizedText {
  const base = readLocalizedFieldWithLegacyFallback(existingJsonb, legacyEn, legacyAr);
  return serializeLocalizedText({
    ...base,
    en: legacyEn?.trim() ?? "",
    ar: legacyAr?.trim() ?? "",
  });
}

export type LocalizedDualWritePayload = {
  jsonb: LocalizedText;
  en: string;
  ar: string;
};

/** Build jsonb + legacy en/ar columns for transition dual-write. */
export function prepareLocalizedDualWritePayload(
  text: Bi | LocalizedText | unknown,
): LocalizedDualWritePayload {
  const jsonb = serializeLocalizedText(parseLocalizedText(text));
  return {
    jsonb,
    en: jsonb.en,
    ar: jsonb.ar,
  };
}

/** Map dual-write payload onto a column name (e.g. title → title, title_en, title_ar). */
export function localizedDualWriteColumnSet(
  columnPrefix: string,
  text: Bi | LocalizedText | unknown,
): Record<string, LocalizedText | string> {
  const { jsonb, en, ar } = prepareLocalizedDualWritePayload(text);
  return {
    [columnPrefix]: jsonb,
    [`${columnPrefix}_en`]: en,
    [`${columnPrefix}_ar`]: ar,
  };
}

export type CompleteMissingTranslationsPlan = {
  entity: "assignment" | "notification" | "weekly_plan_label" | "lesson";
  missing: MissingLocalizedSlot[];
  complete: boolean;
};

/** Scan a localized structure and return a unified completeness plan (OpenAI-free). */
export function buildCompleteMissingTranslationsPlan(input: {
  entity: CompleteMissingTranslationsPlan["entity"];
  fields: Record<string, Bi | LocalizedText | undefined>;
}): CompleteMissingTranslationsPlan {
  let report: LocalizedCompletenessReport;

  switch (input.entity) {
    case "assignment":
      report = collectAssignmentMissingLocalizedSlots({
        title: input.fields.title,
        instructions: input.fields.instructions,
      });
      break;
    case "notification":
      report = collectNotificationMissingLocalizedSlots({
        title: input.fields.title,
        body: input.fields.body,
      });
      break;
    case "weekly_plan_label":
      report = collectWeeklyPlanLabelMissingLocalizedSlots({
        label: input.fields.label,
      });
      break;
    case "lesson":
    default:
      report = collectLessonMissingLocalizedSlots({
        title: input.fields.title,
        unit: input.fields.unit,
        outcome: input.fields.outcome,
        explanation: input.fields.explanation,
        subject: input.fields.subject,
        vocab: input.fields.vocab as import("@/lib/lesson-vocab").VocabularyItem[] | undefined,
      });
      break;
  }

  return {
    entity: input.entity,
    missing: report.missing,
    complete: report.complete,
  };
}
