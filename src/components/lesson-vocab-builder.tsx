import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, L } from "@/lib/i18n";
import { AiActionBanner, type AiActionStatus } from "@/components/ai-action-banner";
import {
  aiDisabledMessage,
  callIgniteVocabSuggest,
  IgniteAiError,
  type VocabAiSuggestion,
} from "@/lib/ai/ignite-ai";
import { buildEducationalCacheKey } from "@/lib/translation-cache";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import { emptyVocabItem } from "@/lib/lesson-vocab";

const EXAMPLE = {
  wordAr: "الواقعة",
  meaningAr: "اسم من أسماء يوم القيامة",
  wordEn: "The Event",
  meaningEn: "One of the names of the Day of Judgment",
};

const EXTRA_LANGS = [
  { key: "fr" as const, labelEn: "French", labelAr: "فرنسي" },
  { key: "de" as const, labelEn: "German", labelAr: "ألماني" },
  { key: "ur" as const, labelEn: "Urdu", labelAr: "أردو" },
  { key: "zh" as const, labelEn: "Chinese", labelAr: "صيني" },
];

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function VocabAiReview({
  suggestion,
  onApply,
  onDiscard,
}: {
  suggestion: VocabAiSuggestion;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const { lang } = useI18n();
  const m = suggestion.meaning;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        {L("AI suggestion — review before saving", "اقتراح الذكاء الاصطناعي — راجع قبل الحفظ")[lang]}
      </p>
      {suggestion.note && (
        <p className="text-sm text-muted-foreground">{suggestion.note}</p>
      )}
      <div className="grid gap-2 text-sm">
        <div><span className="font-semibold">AR:</span> {m.ar || "—"}</div>
        <div><span className="font-semibold">EN:</span> {m.en || "—"}</div>
        <div><span className="font-semibold">FR:</span> {m.fr || "—"}</div>
        <div><span className="font-semibold">DE:</span> {m.de || "—"}</div>
        <div><span className="font-semibold">UR:</span> {m.ur || "—"}</div>
        <div><span className="font-semibold">ZH:</span> {m.zh || "—"}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {L("Apply meanings", "تطبيق المعاني")[lang]}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
        >
          {L("Discard", "تجاهل")[lang]}
        </button>
      </div>
    </div>
  );
}

export function LessonVocabBuilder({
  items,
  onChange,
  inputClassName = "input",
  lessonId,
}: {
  items: VocabularyItem[];
  onChange: (items: VocabularyItem[]) => void;
  inputClassName?: string;
  lessonId?: string;
}) {
  const { lang } = useI18n();
  const [aiIndex, setAiIndex] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState<number | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<VocabAiSuggestion | null>(null);
  const [aiStatus, setAiStatus] = useState<AiActionStatus>({ kind: "idle" });

  const updateWord = (index: number, patch: Partial<VocabularyItem["word"]>) => {
    onChange(
      items.map((item, i) =>
        i === index ? { ...item, word: { ...item.word, ...patch } } : item,
      ),
    );
  };

  const updateMeaning = (index: number, patch: Partial<VocabularyItem["meaning"]>) => {
    onChange(
      items.map((item, i) =>
        i === index ? { ...item, meaning: { ...item.meaning, ...patch } } : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(copy);
  };

  const addItem = () => {
    onChange([...items, emptyVocabItem()]);
  };

  const suggestMeanings = async (index: number) => {
    const item = items[index];
    const wordAr = item.word.ar.trim();
    const wordEn = item.word.en.trim();
    console.info("[IgniteAI] Vocab suggest clicked", { index, wordAr, wordEn });

    if (!wordAr && !wordEn) {
      const msg = L("Enter a word first.", "أدخل الكلمة أولاً.")[lang];
      setAiStatus({ kind: "error", message: msg });
      toast.error(msg);
      return;
    }

    setAiLoading(index);
    setAiIndex(index);
    setAiSuggestion(null);
    setAiStatus({
      kind: "loading",
      message: L("Generating meaning suggestion…", "جارٍ اقتراح المعنى…")[lang],
    });

    try {
      const result = await callIgniteVocabSuggest({ wordAr, wordEn });
      console.info("[IgniteAI] Vocab suggest result", result);

      if (!result.serviceAvailable || result.openAiConfigured === false) {
        const msg = aiDisabledMessage(lang);
        setAiStatus({ kind: "error", message: msg });
        toast.error(msg);
        setAiIndex(null);
        return;
      }
      if (!result.suggestion) {
        const msg = L("Could not generate a suggestion.", "تعذر إنشاء اقتراح.")[lang];
        setAiStatus({ kind: "error", message: msg });
        toast.error(msg);
        setAiIndex(null);
        return;
      }
      setAiSuggestion(result.suggestion);
      setAiStatus({
        kind: "success",
        message: L("Suggestion ready — review and apply below.", "الاقتراح جاهز — راجعه وطبّقه أدناه.")[lang],
      });
    } catch (error) {
      const msg =
        error instanceof IgniteAiError
          ? error.message
          : aiDisabledMessage(lang);
      console.error("[IgniteAI] Vocab suggest failed", error);
      setAiStatus({ kind: "error", message: msg });
      toast.error(msg);
      setAiIndex(null);
    } finally {
      setAiLoading(null);
    }
  };

  const applySuggestion = (index: number) => {
    if (!aiSuggestion) return;
    onChange(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              meaning: {
                ar: aiSuggestion.meaning.ar,
                en: aiSuggestion.meaning.en,
              },
            }
          : item,
      ),
    );

    if (lessonId) {
      const sourceText = aiSuggestion.meaning.en || aiSuggestion.meaning.ar;
      const sourceLang = aiSuggestion.meaning.en ? "en" : "ar";
      if (sourceText) {
        void (async () => {
          try {
            const { igniteCacheWarm } = await import("@/lib/api/ai.functions");
            const entries = EXTRA_LANGS.map(({ key }) => {
              const translated =
                key === "fr"
                  ? aiSuggestion.meaning.fr
                  : key === "de"
                    ? aiSuggestion.meaning.de
                    : key === "ur"
                      ? aiSuggestion.meaning.ur
                      : aiSuggestion.meaning.zh;
              if (!translated?.trim()) return null;
              return {
                cacheKey: buildEducationalCacheKey({
                  lang: key,
                  contentType: "vocab_def",
                  lessonId,
                  fieldName: `vocab_def_${index}`,
                  source: sourceText,
                }),
                sourceText,
                sourceLang: sourceLang as "en" | "ar",
                targetLang: key,
                contentType: "vocab_def",
                lessonId,
                fieldName: `vocab_def_${index}`,
                translatedText: translated,
                provider: "openai",
              };
            }).filter(Boolean) as Array<{
              cacheKey: string;
              sourceText: string;
              sourceLang: "en" | "ar";
              targetLang: "fr" | "de" | "ur" | "zh";
              contentType: string;
              lessonId: string;
              fieldName: string;
              translatedText: string;
              provider: string;
            }>;
            if (entries.length > 0) {
              await igniteCacheWarm({ data: { entries } });
            }
          } catch {
            // best-effort cache warm
          }
        })();
      }
    }

    setAiSuggestion(null);
    setAiIndex(null);
    toast.success(L("Meanings applied. Save the lesson to keep them.", "تم تطبيق المعاني. احفظ الدرس للاحتفاظ بها.")[lang]);
  };

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-4">
      <div>
        <h4 className="font-display text-lg text-foreground">
          {L("Key Vocabulary", "المفردات الأساسية")[lang]}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {L(
            "Add words with Arabic and English meanings. Students flip cards to reveal definitions.",
            "أضف الكلمات مع معانيها بالعربية والإنجليزية. يقلب الطلاب البطاقات لاكتشاف المعنى.",
          )[lang]}
        </p>
      </div>

      <AiActionBanner status={aiStatus} />

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          {L("No vocabulary yet. Add your first word below.", "لا توجد مفردات بعد. أضف أول كلمة أدناه.")[lang]}
        </p>
      )}

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-primary/20 bg-card p-4 shadow-[var(--shadow-soft)] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {L("Word", "كلمة")[lang]} {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { void suggestMeanings(index); }}
                  disabled={aiLoading === index}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                >
                  {aiLoading === index ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {L("AI meaning", "اقتراح المعنى بالذكاء الاصطناعي")[lang]}
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
                  aria-label={L("Move up", "تحريك لأعلى")[lang]}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
                  aria-label={L("Move down", "تحريك لأسفل")[lang]}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-lg border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10"
                  aria-label={L("Delete", "حذف")[lang]}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {aiIndex === index && aiSuggestion && (
              <VocabAiReview
                suggestion={aiSuggestion}
                onApply={() => applySuggestion(index)}
                onDiscard={() => {
                  setAiSuggestion(null);
                  setAiIndex(null);
                }}
              />
            )}

            <Row>
              <Field label={L("Word (Arabic)", "الكلمة (عربي)")[lang]}>
                <input
                  className={inputClassName}
                  dir="rtl"
                  value={item.word.ar}
                  onChange={(e) => updateWord(index, { ar: e.target.value })}
                  placeholder={EXAMPLE.wordAr}
                />
              </Field>
              <Field label={L("Meaning (Arabic)", "المعنى (عربي)")[lang]}>
                <textarea
                  className={inputClassName}
                  dir="rtl"
                  rows={2}
                  value={item.meaning.ar}
                  onChange={(e) => updateMeaning(index, { ar: e.target.value })}
                  placeholder={EXAMPLE.meaningAr}
                />
              </Field>
            </Row>
            <Row>
              <Field label={L("Word (English)", "الكلمة (إنجليزي)")[lang]}>
                <input
                  className={inputClassName}
                  value={item.word.en}
                  onChange={(e) => updateWord(index, { en: e.target.value })}
                  placeholder={EXAMPLE.wordEn}
                />
              </Field>
              <Field label={L("Meaning (English)", "المعنى (إنجليزي)")[lang]}>
                <textarea
                  className={inputClassName}
                  rows={2}
                  value={item.meaning.en}
                  onChange={(e) => updateMeaning(index, { en: e.target.value })}
                  placeholder={EXAMPLE.meaningEn}
                />
              </Field>
            </Row>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {L("Add vocabulary", "إضافة مفردة")[lang]}
      </button>
    </div>
  );
}
