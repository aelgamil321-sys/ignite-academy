import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  aiDisabledMessage,
  callIgniteGenerateLessonFromFile,
  fetchIgniteAiStatus,
  type GenerateLessonFromFileResponse,
} from "@/lib/ai/ignite-ai";
import type { LessonAiOutput, LessonGenerationMetadata } from "@/lib/ai/lesson-generation-types";
import type { MainLessonFileRef } from "@/lib/lesson-main-file";
import { inferMainFileType } from "@/lib/lesson-main-file";
import { useI18n, L } from "@/lib/i18n";
import type { Bi, QuizQuestion } from "@/lib/curriculum";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import {
  LessonAiMultilingualReview,
} from "@/components/lesson-ai-multilingual-review";
import type { LessonAiReviewBundle } from "@/lib/lesson-ai-saved-content";
import { reconstructSourceLessonOutput } from "@/lib/lesson-ai-saved-content";

export type LessonAiGenerationUiStatus =
  | "disabled"
  | "ready"
  | "generating"
  | "translating"
  | "generated"
  | "needs_review"
  | "translation_partial"
  | "failed";

export type LessonAiGeneratedPayload = {
  title: Bi;
  unit: Bi;
  outcome: Bi;
  explanation: Bi;
  vocab: VocabularyItem[];
  quiz: QuizQuestion[];
  metadata?: LessonGenerationMetadata;
};

export function LessonAiGeneratePanel({
  lessonId,
  sourceLanguage,
  lessonTitle,
  unitNumber,
  learningOutcome,
  mainFile,
  coreFieldsValid,
  savedReviewBundle = null,
  onGenerated,
}: {
  lessonId: string;
  sourceLanguage: "en" | "ar";
  lessonTitle: string;
  unitNumber: string;
  learningOutcome: string;
  mainFile: MainLessonFileRef | null;
  coreFieldsValid: boolean;
  /** Hydrate review UI from persisted lesson data after refresh. */
  savedReviewBundle?: LessonAiReviewBundle | null;
  onGenerated: (payload: LessonAiGeneratedPayload) => void;
}) {
  const { lang } = useI18n();
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<LessonAiGenerationUiStatus>(() =>
    savedReviewBundle ? "generated" : "disabled",
  );
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<LessonGenerationMetadata | null>(null);
  const [reviewBundle, setReviewBundle] = useState<LessonAiReviewBundle | null>(savedReviewBundle);
  const [hydratedFromSave, setHydratedFromSave] = useState(Boolean(savedReviewBundle));
  const sourceLessonRef = useRef<LessonAiOutput | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (savedReviewBundle) {
      setReviewBundle(savedReviewBundle);
      setStatus("generated");
      setHydratedFromSave(true);
      setError(null);
    }
  }, [lessonId, savedReviewBundle]);

  useEffect(() => {
    void fetchIgniteAiStatus().then((s) => {
      setOpenAiConfigured(s.openAiConfigured);
    });
  }, []);

  useEffect(() => {
    if (openAiConfigured === null) return;
    if (!openAiConfigured) {
      setStatus("disabled");
      return;
    }
    if (
      status === "generating" ||
      status === "translating" ||
      status === "generated" ||
      status === "needs_review" ||
      status === "translation_partial"
    ) {
      return;
    }
    if (reviewBundle) {
      setStatus("generated");
      return;
    }
    setStatus(mainFile && coreFieldsValid ? "ready" : "disabled");
  }, [openAiConfigured, mainFile, coreFieldsValid, status, reviewBundle]);

  const hasSavedOrGeneratedContent = Boolean(reviewBundle);

  const confirmRegenerate = () =>
    window.confirm(
      L(
        "This will replace the current generated draft content and may use API credits. Continue?",
        "سيؤدي هذا إلى استبدال المحتوى المولّد الحالي وقد يستخدم رصيد API. هل تريد المتابعة؟",
      )[lang],
    );

  const applyResult = (result: GenerateLessonFromFileResponse) => {
    if (!result.ok) {
      setStatus("failed");
      setError(result.error);
      toast.error(result.error);
      return;
    }

    setMetadata(result.data.metadata);
    const bundle: LessonAiReviewBundle = {
      title: result.data.title,
      unit: result.data.unit,
      outcome: result.data.outcome,
      explanation: result.data.explanation,
      vocab: result.data.vocab,
      quiz: result.data.quiz,
    };
    setReviewBundle(bundle);
    sourceLessonRef.current = result.sourceLesson;
    setHydratedFromSave(false);
    onGenerated({ ...bundle, metadata: result.data.metadata });

    if (result.status === "translation_partial") {
      setStatus("translation_partial");
      setError(result.data.metadata.translationError ?? null);
      toast.warning(
        L("Lesson generated; translation incomplete.", "تم توليد الدرس؛ الترجمة غير مكتملة.")[lang],
      );
      return;
    }

    setStatus(result.status === "needs_review" ? "needs_review" : "generated");
    setError(null);
    toast.success(
      result.status === "needs_review"
        ? L("Ready for review — please verify sacred text and content", "جاهز للمراجعة — يُرجى التحقق من النصوص الشرعية والمحتوى")[lang]
        : L("Lesson content ready for review", "محتوى الدرس جاهز للمراجعة")[lang],
    );
  };

  const resolveSourceLessonForRetry = (): LessonAiOutput | null => {
    if (sourceLessonRef.current) return sourceLessonRef.current;
    if (!reviewBundle) return null;
    return reconstructSourceLessonOutput({
      bundle: reviewBundle,
      lessonTitle,
      unitNumber,
      learningOutcome,
      sourceLanguageHint: sourceLanguage,
    });
  };

  const runGeneration = async (translateOnly: boolean) => {
    if (inFlightRef.current) return;
    if (!translateOnly && hasSavedOrGeneratedContent && !confirmRegenerate()) return;
    if (!translateOnly) {
      if (!mainFile) {
        toast.error(L("Upload the main lesson file first", "ارفع ملف الدرس الرئيسي أولًا")[lang]);
        return;
      }
      if (!coreFieldsValid) {
        toast.error(L("Complete required lesson fields first", "أكمل الحقول المطلوبة أولًا")[lang]);
        return;
      }
    } else if (!resolveSourceLessonForRetry()) {
      toast.error(L("No source lesson available to translate", "لا يوجد درس مصدر للترجمة")[lang]);
      return;
    }

    inFlightRef.current = true;
    setError(null);
    const fileType = mainFile ? inferMainFileType(mainFile.fileName) ?? undefined : undefined;
    const basePayload = {
      lessonId,
      fileUrl: mainFile?.url ?? "",
      fileName: mainFile?.fileName ?? "lesson.pdf",
      fileType: fileType ?? undefined,
      sourceLanguage,
      lessonTitle,
      unitNumber,
      learningOutcome,
    };

    try {
      if (!translateOnly) {
        setStatus("generating");
        const sourceResult = await callIgniteGenerateLessonFromFile({
          ...basePayload,
          sourceOnly: true,
        });
        if (!sourceResult.ok) {
          applyResult(sourceResult);
          return;
        }
        sourceLessonRef.current = sourceResult.sourceLesson;

        setStatus("translating");
        const result = await callIgniteGenerateLessonFromFile({
          ...basePayload,
          translateOnly: true,
          sourceLesson: sourceResult.sourceLesson,
        });
        applyResult(result);
        return;
      }

      setStatus("translating");
      const sourceLesson = resolveSourceLessonForRetry();
      const result = await callIgniteGenerateLessonFromFile({
        ...basePayload,
        translateOnly: true,
        sourceLesson: sourceLesson ?? undefined,
      });
      applyResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : L("Generation failed", "فشل التوليد")[lang];
      setStatus("failed");
      setError(message);
      toast.error(message);
    } finally {
      inFlightRef.current = false;
    }
  };

  const statusLabel = (() => {
    switch (status) {
      case "disabled":
        return openAiConfigured === false
          ? aiDisabledMessage(lang)
          : L("Upload file and complete required fields to enable AI", "ارفع الملف وأكمل الحقول المطلوبة لتفعيل الذكاء الاصطناعي")[lang];
      case "ready":
        return L("Ready to generate", "جاهز للتوليد")[lang];
      case "generating":
        return L("Generating lesson…", "جارٍ توليد الدرس…")[lang];
      case "translating":
        return L("Translating…", "جارٍ الترجمة…")[lang];
      case "generated":
        return hydratedFromSave && !metadata
          ? L("Review generated content", "مراجعة المحتوى المولّد")[lang]
          : L("Ready for review", "جاهز للمراجعة")[lang];
      case "needs_review":
        return L("Ready for review — needs attention", "جاهز للمراجعة — يحتاج انتباهًا")[lang];
      case "translation_partial":
        return L("Source generated — translation incomplete", "تم توليد المصدر — الترجمة غير مكتملة")[lang];
      case "failed":
        return L("Generation failed", "فشل التوليد")[lang];
      default:
        return "";
    }
  })();

  const busy = status === "generating" || status === "translating";
  const canGenerate =
    !busy &&
    !hasSavedOrGeneratedContent &&
    (status === "ready" || status === "failed");
  const canRegenerate =
    !busy &&
    hasSavedOrGeneratedContent &&
    (status === "generated" || status === "needs_review" || status === "translation_partial" || status === "failed");

  const usage = metadata?.usage;

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        <h3 className="font-display text-lg">
          {hasSavedOrGeneratedContent
            ? L("Generated content", "المحتوى المولّد")[lang]
            : L("Generate Lesson with AI", "توليد الدرس بالذكاء الاصطناعي")[lang]}
        </h3>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {L(
          "AI generates a grounded source lesson, then translates it into six platform languages. Review everything before publishing.",
          "يولّد الذكاء الاصطناعي درسًا مصدرًا ثم يترجمه إلى ست لغات. راجع كل المحتوى قبل النشر.",
        )[lang]}
      </p>

      <div
        className={`rounded-lg px-3 py-2 text-xs font-medium ${
          status === "failed"
            ? "bg-destructive/10 text-destructive"
            : status === "needs_review" || status === "translation_partial"
              ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : status === "generated"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
        }`}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {statusLabel}
          </span>
        ) : status === "needs_review" || status === "translation_partial" ? (
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {statusLabel}
          </span>
        ) : status === "generated" ? (
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {statusLabel}
          </span>
        ) : (
          statusLabel
        )}
      </div>

      {error ? <p className="text-xs text-destructive break-words">{error}</p> : null}

      {metadata ? (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {L("Source file", "الملف المصدر")[lang]}: {metadata.sourceFileName}
          </p>
          <p>
            {L("Model", "النموذج")[lang]}: {metadata.provider}/{metadata.model}
          </p>
          {usage?.cost?.estimatedCostUsd != null ? (
            <p className="text-[10px] text-muted-foreground/80">
              {L("Estimated API cost", "تكلفة API التقديرية")[lang]}: ${usage.cost.estimatedCostUsd.toFixed(4)}
            </p>
          ) : null}
          {metadata.needsReview ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              {L(
                "AI detected Qur'an/Hadith or unreadable sacred text. Please verify before publishing.",
                "اكتشف الذكاء الاصطناعي آيات قرآنية/أحاديث أو نصًا شرعيًا غير مقروء. يُرجى التحقق قبل النشر.",
              )[lang]}
            </div>
          ) : null}
          {metadata.warnings && metadata.warnings.length > 0 ? (
            <ul className="list-disc ps-4 text-amber-700 dark:text-amber-300">
              {metadata.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {reviewBundle ? (
        <LessonAiMultilingualReview
          bundle={reviewBundle}
          onChange={(next) => {
            setReviewBundle(next);
            onGenerated({ ...next, metadata: metadata ?? undefined });
          }}
          onRetryTranslations={
            resolveSourceLessonForRetry() && !busy && openAiConfigured !== false
              ? () => void runGeneration(true)
              : undefined
          }
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {hasSavedOrGeneratedContent ? (
          <button
            type="button"
            disabled={!canRegenerate || openAiConfigured === false}
            onClick={() => void runGeneration(false)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {status === "generating"
              ? L("Regenerating…", "جارٍ إعادة التوليد…")[lang]
              : L("Regenerate with AI", "إعادة التوليد بالذكاء الاصطناعي")[lang]}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canGenerate || openAiConfigured === false}
            onClick={() => void runGeneration(false)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {status === "generating"
              ? L("Generating…", "جارٍ التوليد…")[lang]
              : status === "failed"
                ? L("Retry generation", "إعادة التوليد")[lang]
                : L("Generate with AI", "توليد بالذكاء الاصطناعي")[lang]}
          </button>
        )}

        {status === "translation_partial" ? (
          <button
            type="button"
            disabled={busy || openAiConfigured === false}
            onClick={() => void runGeneration(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            {status === "translating" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {L("Retry translations", "إعادة الترجمة")[lang]}
          </button>
        ) : null}
      </div>
    </div>
  );
}
