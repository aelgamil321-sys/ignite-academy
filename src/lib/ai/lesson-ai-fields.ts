import type { Lang } from "@/lib/i18n-config";
import type { EducationalContentType } from "@/lib/translate-educational-content";
import type { Bi } from "@/lib/curriculum";
import type { QuizQuestion } from "@/lib/curriculum";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import { pickVocabMeaningBi, pickVocabWordBi } from "@/lib/lesson-vocab";
import type { LessonAiField } from "@/lib/ai/ignite-ai.server";

function sourceLangForText(text: string): "en" | "ar" {
  return /[\u0600-\u06FF]/.test(text) && !/[A-Za-z]{4,}/.test(text) ? "ar" : "en";
}

function pushBiField(
  fields: LessonAiField[],
  lessonId: string,
  fieldName: string,
  contentType: EducationalContentType,
  bi: Bi,
) {
  const en = bi.en?.trim();
  const ar = bi.ar?.trim();
  const text = en || ar;
  if (!text) return;
  fields.push({
    fieldName,
    contentType,
    text,
    sourceLang: en ? "en" : "ar",
  });
}

/** Collect all translatable lesson fields from admin form state. */
export function collectLessonAiFields(input: {
  lessonId: string;
  unit: Bi;
  title: Bi;
  outcome: Bi;
  explanation: Bi;
  vocab: VocabularyItem[];
  quiz: QuizQuestion[];
}): LessonAiField[] {
  const { lessonId } = input;
  const fields: LessonAiField[] = [];

  pushBiField(fields, lessonId, "unit", "general", input.unit);
  pushBiField(fields, lessonId, "title", "title", input.title);
  pushBiField(fields, lessonId, "outcome", "outcome", input.outcome);
  pushBiField(fields, lessonId, "explanation", "content", input.explanation);

  input.vocab.forEach((item, i) => {
    const word = pickVocabWordBi(item, "en");
    const meaning = pickVocabMeaningBi(item, "en");
    const wordText = word.en?.trim() || word.ar?.trim();
    const meaningText = meaning.en?.trim() || meaning.ar?.trim();
    if (wordText) {
      fields.push({
        fieldName: `vocab_term_${i}`,
        contentType: "vocab_term",
        text: wordText,
        sourceLang: sourceLangForText(wordText),
      });
    }
    if (meaningText) {
      fields.push({
        fieldName: `vocab_def_${i}`,
        contentType: "vocab_def",
        text: meaningText,
        sourceLang: sourceLangForText(meaningText),
      });
    }
  });

  input.quiz.forEach((q, qi) => {
    pushBiField(fields, lessonId, `quiz_q_${qi}`, "quiz_question", q.q);
    q.options.forEach((opt, oi) => {
      pushBiField(fields, lessonId, `quiz_q_${qi}_opt_${oi}`, "quiz_option", opt);
    });
  });

  return fields;
}

export type IgniteTranslateRequest = {
  texts: string[];
  targetLang: Lang;
  sourceLang?: "en" | "ar";
  contentType?: EducationalContentType;
  lessonId?: string;
  fieldNames?: string[];
};

export type IgniteTranslateResponse = {
  translations: string[];
  serviceAvailable: boolean;
  fromCache: boolean[];
  providers: string[];
};

export type IgniteVocabSuggestRequest = {
  wordAr: string;
  wordEn: string;
};

export type IgnitePregenerateRequest = {
  lessonId: string;
  fields: LessonAiField[];
};
