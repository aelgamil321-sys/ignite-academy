import type { LessonAiOutput } from "@/lib/ai/lesson-generation-types";

const REFUSAL_PATTERNS: RegExp[] = [
  /\bi['’]?m sorry\b/i,
  /\bi can only assist\b/i,
  /\bi cannot\b/i,
  /\bi can't\b/i,
  /\bas an ai\b/i,
  /\bas a language model\b/i,
  /\bi(?:'m| am) not able to\b/i,
  /\bi am unable\b/i,
  /\bunable to help\b/i,
  /\bplease provide\b/i,
  /\bhere is the translation\b/i,
  /\bif you have any specific questions\b/i,
  /\bislamic studies content in english\b/i,
  /\bpolicy (?:prevents|does not allow)\b/i,
  /\bnot (?:able|allowed) to (?:assist|help|provide)\b/i,
];

/** True when text looks like model refusal / meta-assistant output, not lesson content. */
export function isRefusalOrMetaAiOutput(text: string | null | undefined): boolean {
  const value = text?.trim();
  if (!value) return false;
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(value));
}

function collectLessonAiTextFields(output: LessonAiOutput): string[] {
  const texts = [output.lesson_summary];
  for (const item of output.vocabulary) {
    texts.push(item.term, item.synonym_or_simple_meaning);
  }
  for (const mc of output.quiz.multiple_choice) {
    texts.push(mc.question, ...mc.options);
  }
  for (const tf of output.quiz.true_false) {
    texts.push(tf.statement);
  }
  for (const essay of output.quiz.essay) {
    texts.push(essay.question);
    if (essay.grading_guide) texts.push(essay.grading_guide);
  }
  return texts.filter(Boolean);
}

/** Scan generated lesson JSON for refusal/meta strings. OpenAI-free. */
export function findRefusalOrMetaAiFields(output: LessonAiOutput): string[] {
  const issues: string[] = [];
  if (isRefusalOrMetaAiOutput(output.lesson_summary)) {
    issues.push("lesson_summary");
  }
  output.vocabulary.forEach((item, index) => {
    if (isRefusalOrMetaAiOutput(item.term)) issues.push(`vocabulary[${index}].term`);
    if (isRefusalOrMetaAiOutput(item.synonym_or_simple_meaning)) {
      issues.push(`vocabulary[${index}].synonym_or_simple_meaning`);
    }
  });
  output.quiz.multiple_choice.forEach((mc, index) => {
    if (isRefusalOrMetaAiOutput(mc.question)) issues.push(`quiz.multiple_choice[${index}].question`);
    mc.options.forEach((opt, optIndex) => {
      if (isRefusalOrMetaAiOutput(opt)) {
        issues.push(`quiz.multiple_choice[${index}].options[${optIndex}]`);
      }
    });
  });
  output.quiz.true_false.forEach((tf, index) => {
    if (isRefusalOrMetaAiOutput(tf.statement)) issues.push(`quiz.true_false[${index}].statement`);
  });
  output.quiz.essay.forEach((essay, index) => {
    if (isRefusalOrMetaAiOutput(essay.question)) issues.push(`quiz.essay[${index}].question`);
    if (isRefusalOrMetaAiOutput(essay.grading_guide)) {
      issues.push(`quiz.essay[${index}].grading_guide`);
    }
  });
  // Catch-all on concatenated body for edge phrasing
  const blob = collectLessonAiTextFields(output).join("\n");
  if (issues.length === 0 && isRefusalOrMetaAiOutput(blob)) {
    issues.push("lesson_body");
  }
  return issues;
}

export function validateLessonAiOutputGuard(output: LessonAiOutput): {
  ok: boolean;
  refusalFields: string[];
} {
  const refusalFields = findRefusalOrMetaAiFields(output);
  return { ok: refusalFields.length === 0, refusalFields };
}
