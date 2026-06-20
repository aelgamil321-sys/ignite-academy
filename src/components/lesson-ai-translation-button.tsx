import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, L } from "@/lib/i18n";
import {
  aiDisabledMessage,
  callIgnitePregenerateLesson,
  collectLessonAiFields,
  IgniteAiError,
} from "@/lib/ai/ignite-ai";
import { AiActionBanner, type AiActionStatus } from "@/components/ai-action-banner";
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
  const [status, setStatus] = useState<AiActionStatus>({ kind: "idle" });

  const run = async () => {
    console.info("[IgniteAI] Generate translations clicked", { lessonId });

    if (!lessonId) {
      const msg = L("Save the lesson first to generate translations.", "احفظ الدرس أولاً لتوليد الترجمات.")[lang];
      setStatus({ kind: "error", message: msg });
      toast.error(msg);
      return;
    }

    setLoading(true);
    setStatus({
      kind: "loading",
      message: L("Generating translations…", "جارٍ توليد الترجمات…")[lang],
    });

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
        const msg = L("No lesson text to translate yet.", "لا يوجد نص للترجمة بعد.")[lang];
        setStatus({ kind: "error", message: msg });
        toast.info(msg);
        return;
      }

      const result = await callIgnitePregenerateLesson({ lessonId, fields });
      console.info("[IgniteAI] Pregenerate result", result);

      if (!result.serviceAvailable) {
        const msg = aiDisabledMessage(lang === "ar" ? "ar" : "en");
        setStatus({ kind: "error", message: msg });
        toast.error(msg);
        return;
      }

      const successMsg = L(
        `Done — generated ${result.generated} translations (${result.cached} already cached).`,
        `تم — توليد ${result.generated} ترجمة (${result.cached} كانت مخزّنة مسبقاً).`,
      )[lang];
      setStatus({ kind: "success", message: successMsg });
      toast.success(successMsg);
    } catch (error) {
      const msg =
        error instanceof IgniteAiError
          ? error.message
          : aiDisabledMessage(lang === "ar" ? "ar" : "en");
      console.error("[IgniteAI] Pregenerate failed", error);
      setStatus({ kind: "error", message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => { void run(); }}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        {L("Generate AI translations", "توليد الترجمات بالذكاء الاصطناعي")[lang]}
      </button>
      <AiActionBanner status={status} />
    </div>
  );
}
