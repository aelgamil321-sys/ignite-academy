import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useI18n, L } from "@/lib/i18n";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import { emptyVocabItem } from "@/lib/lesson-vocab";

const EXAMPLE = {
  wordAr: "الواقعة",
  meaningAr: "اسم من أسماء يوم القيامة",
  wordEn: "The Event",
  meaningEn: "One of the names of the Day of Judgment",
};

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

export function LessonVocabBuilder({
  items,
  onChange,
  inputClassName = "input",
}: {
  items: VocabularyItem[];
  onChange: (items: VocabularyItem[]) => void;
  inputClassName?: string;
}) {
  const { lang } = useI18n();

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
