/** Islamic education stage card imagery — served from /public/images */
export const STAGE_CARD_IMAGES = {
  kg: "/images/stage-kg.jpg",
  elementary: "/images/stage-elementary.jpg",
  middle: "/images/stage-middle.jpg",
  high: "/images/secondary.jpg",
} as const;

export type StageCardKey = keyof typeof STAGE_CARD_IMAGES;

/** Per-stage focal point and light overlay (target ~35–45% visual density). */
export const STAGE_CARD_CONFIG: Record<
  StageCardKey,
  { objectPosition: string; overlayClass: string }
> = {
  kg: {
    objectPosition: "50% 30%",
    overlayClass:
      "bg-gradient-to-t from-brand-dark/50 from-[18%] via-primary/32 via-[48%] to-transparent",
  },
  elementary: {
    objectPosition: "50% 22%",
    overlayClass:
      "bg-gradient-to-t from-brand-dark/48 from-[20%] via-brand-dark/38 via-[50%] to-transparent",
  },
  middle: {
    objectPosition: "50% 38%",
    overlayClass:
      "bg-gradient-to-t from-brand-dark/46 from-[22%] via-brand-dark/40 via-[52%] to-transparent",
  },
  high: {
    objectPosition: "50% 42%",
    overlayClass:
      "bg-gradient-to-t from-brand-dark/45 from-[20%] via-brand-dark/36 via-[48%] to-transparent",
  },
};

export const HOMEPAGE_STAGE_CARDS: Array<{
  key: StageCardKey;
  name: "stage_kg" | "stage_elem" | "stage_mid" | "stage_high";
  grades: "stage_kg_grades" | "stage_elem_grades" | "stage_mid_grades" | "stage_high_grades";
  to: "/grades";
}> = [
  { key: "kg", name: "stage_kg", grades: "stage_kg_grades", to: "/grades" },
  { key: "elementary", name: "stage_elem", grades: "stage_elem_grades", to: "/grades" },
  { key: "middle", name: "stage_mid", grades: "stage_mid_grades", to: "/grades" },
  { key: "high", name: "stage_high", grades: "stage_high_grades", to: "/grades" },
];
