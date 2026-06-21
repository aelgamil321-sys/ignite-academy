import { useState } from "react";
import { BookOpen } from "lucide-react";
import { useI18n, type BiFieldMeta } from "@/lib/i18n";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import { TranslatedContentShell } from "@/components/translation-loading-indicator";

function VocabFlipCard({
  item,
  index,
  lessonMeta,
}: {
  item: VocabularyItem;
  index: number;
  lessonMeta: BiFieldMeta;
}) {
  const { lang, bi, tr, dir } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const contentLang = lang === "ar" || lang === "ur" ? "ar" : "en";
  const hasMeaning = Boolean(item.meaning.en?.trim() || item.meaning.ar?.trim());
  const wordMeta = { ...lessonMeta, fieldName: `vocab_term_${index}`, contentType: "vocab_term" as const };
  const meaningMeta = { ...lessonMeta, fieldName: `vocab_def_${index}`, contentType: "vocab_def" as const };

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="group relative h-44 w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
      aria-pressed={flipped}
      aria-label={`${bi(item.word, wordMeta)} — ${tr("vocab_flip_hint")}`}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front — word */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/25 bg-white p-5 shadow-[0_8px_24px_hsl(var(--primary)/0.12)] transition-shadow group-hover:shadow-[0_12px_32px_hsl(var(--primary)/0.18)] [backface-visibility:hidden]"
        >
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-primary/70">
            {tr("vocab_flip_hint")}
          </div>
          <TranslatedContentShell>
            <p
              className={`font-display text-xl font-semibold text-foreground text-center [overflow-wrap:anywhere] ${
                dir === "rtl" ? "font-arabic" : ""
              }`}
              dir={contentLang === "ar" ? "rtl" : "ltr"}
            >
              {bi(item.word, wordMeta)}
            </p>
          </TranslatedContentShell>
          <div className="mt-3 h-1 w-10 rounded-full bg-primary/40" />
        </div>

        {/* Back — meaning */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/10 via-white to-cream p-5 shadow-[0_8px_24px_hsl(var(--primary)/0.15)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          {hasMeaning ? (
            <TranslatedContentShell>
              <p
                className={`text-sm leading-[1.8] text-foreground/90 text-center [overflow-wrap:anywhere] md:text-base ${
                  dir === "rtl" ? "font-arabic" : ""
                }`}
                dir={contentLang === "ar" ? "rtl" : "ltr"}
              >
                {bi(item.meaning, meaningMeta)}
              </p>
            </TranslatedContentShell>
          ) : (
            <p className="text-sm italic text-muted-foreground text-center leading-relaxed">
              {tr("vocab_meaning_soon")}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export function LessonVocabularyCards({
  items,
  lessonMeta,
}: {
  items: VocabularyItem[];
  lessonMeta: BiFieldMeta;
}) {
  const { tr } = useI18n();

  if (items.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-cream/80 to-white p-5 shadow-[var(--shadow-soft)] md:p-8"
      aria-labelledby="lesson-vocab-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, hsl(var(--primary) / 0.06) 0 1px, transparent 1px 14px),
            repeating-linear-gradient(-45deg, hsl(var(--primary) / 0.06) 0 1px, transparent 1px 14px)
          `,
        }}
      />

      <div className="relative">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 id="lesson-vocab-heading" className="font-display text-xl font-semibold text-foreground md:text-2xl">
              {tr("vocab")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{tr("vocab_subtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {items.map((item, i) => (
            <VocabFlipCard key={i} item={item} index={i} lessonMeta={lessonMeta} />
          ))}
        </div>
      </div>
    </section>
  );
}
