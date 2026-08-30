import type { Bi, QuizQuestion } from "@/lib/curriculum";
import {
  LESSON_LANGS,
  type LessonLang,
  hasLocalizedContent,
  parseLocalizedText,
} from "@/lib/lesson-localized";

export type ResolvedLessonText = {
  value: string;
  /** True when showing text from another language because the requested lang is empty. */
  usedFallback: boolean;
  fallbackLang?: LessonLang;
};

const FALLBACK_ORDER: LessonLang[] = ["en", "ar", "fr", "de", "ur", "zh"];

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_SCRIPT_RE = /[A-Za-z]/;
const CJK_SCRIPT_RE = /[\u4E00-\u9FFF]/;

export function containsArabicScript(text: string): boolean {
  return ARABIC_SCRIPT_RE.test(text);
}

export function containsLatinScript(text: string): boolean {
  return LATIN_SCRIPT_RE.test(text);
}

/** Read only the requested language slot — never fallback to another language. */
export function readLessonLangSlot(text: Bi | undefined, lang: LessonLang): string {
  return parseLocalizedText(text)[lang]?.trim() ?? "";
}

/**
 * True when the slot for `lang` is empty or clearly holds the wrong script
 * (e.g. English prose stored under `ar` after a bad sourceLanguage mapping).
 */
export function isLessonLangSlotMissing(text: Bi | undefined, lang: LessonLang): boolean {
  const value = readLessonLangSlot(text, lang);
  if (!value) return true;

  if (lang === "ar") {
    return containsLatinScript(value) && !containsArabicScript(value);
  }
  if (lang === "ur") {
    return containsLatinScript(value) && !containsArabicScript(value);
  }
  if (lang === "zh") {
    return !CJK_SCRIPT_RE.test(value) && containsLatinScript(value);
  }
  if (lang === "en" || lang === "fr" || lang === "de") {
    return containsArabicScript(value) && !containsLatinScript(value);
  }
  return false;
}

/** QA automation titles/outcomes that must never appear as teacher lesson defaults. */
const QA_TITLE_PATTERNS = [
  /^Create flow QA \d+$/,
  /^RLS QA \d+$/,
  /^QA upload /,
];

const QA_OUTCOME_LITERALS = new Set(["Outcome"]);

export function isQaFixtureLessonTitle(title: string): boolean {
  const t = title.trim();
  return QA_TITLE_PATTERNS.some((pattern) => pattern.test(t));
}

export function isQaFixtureLessonOutcome(outcome: string): boolean {
  return QA_OUTCOME_LITERALS.has(outcome.trim());
}

export function isQaFixtureLessonFields(title: Bi, outcome: Bi): boolean {
  const parsedTitle = parseLocalizedText(title);
  const parsedOutcome = parseLocalizedText(outcome);
  const titleHit = FALLBACK_ORDER.some((lang) => isQaFixtureLessonTitle(parsedTitle[lang] ?? ""));
  const outcomeHit = FALLBACK_ORDER.some((lang) => isQaFixtureLessonOutcome(parsedOutcome[lang] ?? ""));
  return titleHit && outcomeHit;
}

/**
 * Resolve lesson text for a language tab.
 * Never silently substitutes English under Arabic when Arabic exists.
 */
export function resolveLessonLangText(text: Bi | undefined, lang: LessonLang): ResolvedLessonText {
  const direct = readLessonLangSlot(text, lang);
  if (direct && !isLessonLangSlotMissing(text, lang)) {
    return { value: direct, usedFallback: false };
  }

  for (const fallback of FALLBACK_ORDER) {
    if (fallback === lang) continue;
    const candidate = readLessonLangSlot(text, fallback);
    if (candidate && !isLessonLangSlotMissing(text, fallback)) {
      return { value: candidate, usedFallback: true, fallbackLang: fallback };
    }
  }
  return { value: "", usedFallback: false };
}

/** True when the requested lang has its own content (not relying on fallback). */
export function hasLessonLangText(text: Bi | undefined, lang: LessonLang): boolean {
  return hasLocalizedContent(parseLocalizedText(text), lang);
}

export type QuizConsistencyIssue = {
  questionIndex: number;
  type: QuizQuestion["type"];
  message: string;
};

/** Ensure MCQ answer index and T/F boolean are consistent across all populated question translations. */
export function validateQuizAnswerConsistency(questions: QuizQuestion[]): QuizConsistencyIssue[] {
  const issues: QuizConsistencyIssue[] = [];

  questions.forEach((question, questionIndex) => {
    if (question.type === "multiple_choice") {
      const answer = question.answer;
      if (answer < 0 || answer > 3) {
        issues.push({
          questionIndex,
          type: question.type,
          message: `MCQ answer index out of range: ${answer}`,
        });
      }
      const optionCount = question.options.length;
      for (const lang of LESSON_LANGS) {
        const populated = question.options.filter((opt) => hasLocalizedContent(parseLocalizedText(opt), lang));
        if (populated.length > 0 && populated.length < optionCount) {
          issues.push({
            questionIndex,
            type: question.type,
            message: `MCQ options partially translated for ${lang}`,
          });
        }
        if (populated.length > 0 && answer >= populated.length) {
          issues.push({
            questionIndex,
            type: question.type,
            message: `MCQ correct index ${answer} exceeds translated options for ${lang}`,
          });
        }
      }
      return;
    }

    if (question.type === "true_false") {
      if (question.answer !== 0 && question.answer !== 1) {
        issues.push({
          questionIndex,
          type: question.type,
          message: `True/false answer must be 0 or 1, got ${question.answer}`,
        });
      }
      return;
    }

    if (question.type === "essay") {
      const hasQuestion = LESSON_LANGS.some((lang) => hasLocalizedContent(parseLocalizedText(question.q), lang));
      const model = question.modelAnswer;
      const hasModel = model
        ? LESSON_LANGS.some((lang) => hasLocalizedContent(parseLocalizedText(model), lang))
        : false;
      if (hasQuestion && !hasModel) {
        issues.push({
          questionIndex,
          type: question.type,
          message: "Essay question present but model answer missing in all languages",
        });
      }
    }
  });

  return issues;
}

/** Regression helper: Arabic tab must not resolve to English when ar content exists. */
export function arabicTabShowsEnglishWhileArabicExists(
  text: Bi | undefined,
  displayedValue: string,
): boolean {
  const parsed = parseLocalizedText(text);
  const ar = parsed.ar?.trim();
  if (!ar) return false;
  const en = parsed.en?.trim();
  if (!en) return false;
  return displayedValue.trim() === en && displayedValue.trim() !== ar;
}
