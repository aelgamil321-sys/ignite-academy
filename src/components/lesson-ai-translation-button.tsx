import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, L } from "@/lib/i18n";
import {
  aiDisabledMessage,
  callIgnitePregenerateLesson,
  collectLessonAiFields,
} from "@/lib/ai/ignite-ai";
import type { Bi } from "@/lib/curriculum";
import type { QuizQuestion } from "@/lib/curriculum";
import type { VocabularyItem } from "@/lib/lesson-vocab";

export function LessonAiTranslationButton({
  lessonId,
  unit,
  title,
  outcome,
  explanation,
  vocab,
  quiz,
}: {
  lessonId: string;
  unit: Bi;
  title: Bi;
  outcome: Bi;
  explanation: Bi;
  vocab: VocabularyItem[];
  quiz: QuizQuestion[];
}) {
  const { lang } = useI18n();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!lessonId) {
      toast.error(L("Save the lesson first to generate translations.", "احفظ الدرس أولاً لتوليد الترجمات.")[lang]);
      return;
    }

    setLoading(true);
    try {
      const fields = collectLessonAiFields({
        lessonId,
        unit,
        title,
        outcome,
        explanation,
        vocab,
        quiz,
      });

      if (fields.length === 0) {
        toast.info(L("No lesson text to translate yet.", "لا يوجد نص للترجمة بعد.")[lang]);
        return;
      }

      const result = await callIgnitePregenerateLesson({ lessonId, fields });

      if (!result.serviceAvailable) {
        toast.error(aiDisabledMessage(lang === "ar" ? "ar" : "en"));
        return;
      }

      toast.success(
        L(
          `Generated ${result.generated} translations (${result.cached} already cached).`,
          `تم توليد ${result.generated} ترجمة (${result.cached} كانت مخزّنة مسبقاً).`,
        )[lang],
      );
    } catch {
      toast.error(aiDisabledMessage(lang === "ar" ? "ar" : "en"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => { void run(); }}
      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
      {L("Generate AI translations", "توليد الترجمات بالذكاء الاصطناعي")[lang]}
    </button>
  );
}
