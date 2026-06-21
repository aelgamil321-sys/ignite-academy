/**
 * Client-safe re-exports for lesson/quiz dynamic translation.
 * Server logic lives in translate-educational-content.ts and translate.functions.ts.
 */
export {
  needsDynamicTranslation,
  needsMachineTranslation,
  resolveStoredBiText,
  biPendingDisplayText,
  biSourceForTranslation,
  translateEducationalContent,
  translateEducationalBi,
  prefetchEducationalTranslations,
  educationalDisplayFallback,
  hasSuccessfulEducationalTranslations,
  isTranslationServiceAvailable,
  onTranslationAvailabilityChange,
  initEducationalTranslationScheduler,
  resetTranslationSession,
  type EducationalContentType,
  type EducationalField,
  type TranslateEducationalInput,
  type TranslateEducationalResult,
} from "@/lib/translate-educational-content";

/** @deprecated Use translateEducationalContent */
export { translateEducationalContent as translateContent } from "@/lib/translate-educational-content";

/** @deprecated Use translateEducationalBi */
export { translateEducationalBi as translateBi } from "@/lib/translate-educational-content";

/** @deprecated Use educationalDisplayFallback */
export { educationalDisplayFallback as biDisplayFallback } from "@/lib/translate-educational-content";

/** @deprecated Use prefetchEducationalTranslations */
export {
  prefetchEducationalTranslations as prefetchTranslations,
  type EducationalField,
} from "@/lib/translate-educational-content";
