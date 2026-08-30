/** Detect authoritative lesson source language from teacher inputs + extracted text. */
export function detectLessonSourceLanguage(input: {
  lessonTitle: string;
  learningOutcome: string;
  unitNumber?: string;
  extractedText: string;
  hint?: "en" | "ar";
}): "en" | "ar" {
  const sample = [input.lessonTitle, input.learningOutcome, input.unitNumber ?? "", input.extractedText.slice(0, 4000)]
    .join("\n")
    .trim();
  if (!sample) return input.hint ?? "en";

  const arabicChars = (sample.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) ?? []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) ?? []).length;

  if (arabicChars > 0 && arabicChars >= latinChars * 0.35) return "ar";
  if (latinChars > 0) return "en";
  return input.hint ?? "en";
}
