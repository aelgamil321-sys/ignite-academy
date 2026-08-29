import type { ParentGuide } from "@/lib/extras";
import { useI18n } from "@/lib/i18n";

type ParentGuideArticleBodyProps = {
  guide: ParentGuide & { imageUrl?: string };
};

export function ParentGuideArticleBody({ guide }: ParentGuideArticleBodyProps) {
  const { bi } = useI18n();
  const image = guide.imageUrl ?? (guide as { image?: string }).image;

  return (
    <>
      {image ? (
        <img
          src={image}
          alt={bi(guide.title)}
          className="mb-5 w-full max-w-3xl rounded-xl border border-border/90 shadow-sm"
        />
      ) : null}
      <article className="max-w-3xl">
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">{bi(guide.body)}</p>
      </article>
    </>
  );
}
