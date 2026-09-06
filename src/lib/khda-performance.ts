import type { Lang } from "@/lib/i18n-config";
import { translateKey } from "@/lib/i18n";

/** KHDA performance rating 1–8. Null = no score evidence. */
export type KhdaRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type KhdaRatingBand = {
  rating: KhdaRating;
  min: number;
  max: number;
  labelEn: string;
  labelAr: string;
  color: string;
  textColor: string;
};

/** Official KHDA 8-band scale — single source of truth for analytics UI. */
export const KHDA_RATING_BANDS: readonly KhdaRatingBand[] = [
  { rating: 1, min: 1, max: 15, labelEn: "Very Weak", labelAr: "ضعيف جدًا", color: "#DC2626", textColor: "#FFFFFF" },
  { rating: 2, min: 16, max: 50, labelEn: "Weak", labelAr: "ضعيف", color: "#EA580C", textColor: "#FFFFFF" },
  { rating: 3, min: 51, max: 61, labelEn: "Acceptable", labelAr: "مقبول", color: "#D97706", textColor: "#FFFFFF" },
  { rating: 4, min: 62, max: 71, labelEn: "Close to Good", labelAr: "قريب من جيد", color: "#EAB308", textColor: "#1F2937" },
  { rating: 5, min: 72, max: 75, labelEn: "Good", labelAr: "جيد", color: "#16A34A", textColor: "#FFFFFF" },
  { rating: 6, min: 76, max: 81, labelEn: "Close to Very Good", labelAr: "قريب من جيد جدًا", color: "#38BDF8", textColor: "#0F172A" },
  { rating: 7, min: 82, max: 91, labelEn: "Very Good", labelAr: "جيد جدًا", color: "#2563EB", textColor: "#FFFFFF" },
  { rating: 8, min: 92, max: 100, labelEn: "Outstanding", labelAr: "ممتاز", color: "#7C3AED", textColor: "#FFFFFF" },
] as const;

export const KHDA_GOOD_OR_ABOVE_RATING: KhdaRating = 5;

export type QuantitativeDescriptor = {
  min: number;
  max: number;
  labelEn: string;
  labelAr: string;
};

/** Proportion descriptors — NOT KHDA ratings. */
export const QUANTITATIVE_DESCRIPTORS: readonly QuantitativeDescriptor[] = [
  { min: 0, max: 15, labelEn: "Few", labelAr: "عدد قليل" },
  { min: 16, max: 30, labelEn: "Minority", labelAr: "أقلية" },
  { min: 31, max: 49, labelEn: "Significant Minority", labelAr: "أقلية ملحوظة" },
  { min: 50, max: 60, labelEn: "Majority", labelAr: "غالبية" },
  { min: 61, max: 74, labelEn: "Large Majority", labelAr: "غالبية كبيرة" },
  { min: 75, max: 90, labelEn: "Most", labelAr: "معظم" },
  { min: 91, max: 100, labelEn: "Almost All", labelAr: "الجميع تقريبًا" },
] as const;

/**
 * Map a percentage score to a KHDA rating.
 * Returns null when score is null/undefined (no assessment evidence).
 * A real 0% average from submitted assessments maps to Rating 1 (Very Weak).
 */
export function khdaRatingFromScore(score: number | null | undefined): KhdaRating | null {
  if (score === null || score === undefined) return null;
  const rounded = Math.round(score);
  if (rounded === 0) return 1;
  if (rounded < 0) return null;
  for (const band of KHDA_RATING_BANDS) {
    if (rounded >= band.min && rounded <= band.max) return band.rating;
  }
  return null;
}

/** True when a student has quiz submission evidence for analytics. */
export function hasAssessmentEvidence(submissionCount: number): boolean {
  return submissionCount > 0;
}

export function khdaBandForRating(rating: KhdaRating): KhdaRatingBand {
  return KHDA_RATING_BANDS[rating - 1];
}

const KHDA_BAND_LABEL_KEYS: Record<KhdaRating, `khda_band_${KhdaRating}_label`> = {
  1: "khda_band_1_label",
  2: "khda_band_2_label",
  3: "khda_band_3_label",
  4: "khda_band_4_label",
  5: "khda_band_5_label",
  6: "khda_band_6_label",
  7: "khda_band_7_label",
  8: "khda_band_8_label",
};

export function khdaRatingLabel(rating: KhdaRating | null, lang: Lang): string {
  if (rating === null) return translateKey("khda_no_data", lang);
  return translateKey(KHDA_BAND_LABEL_KEYS[rating], lang);
}

export function khdaRatingColor(rating: KhdaRating | null): string {
  if (rating === null) return "#94A3B8";
  return khdaBandForRating(rating).color;
}

const QUANTITATIVE_DESCRIPTOR_KEYS = [
  { min: 0, max: 15, key: "khda_qdesc_few" as const },
  { min: 16, max: 30, key: "khda_qdesc_minority" as const },
  { min: 31, max: 49, key: "khda_qdesc_sig_minority" as const },
  { min: 50, max: 60, key: "khda_qdesc_majority" as const },
  { min: 61, max: 74, key: "khda_qdesc_large_majority" as const },
  { min: 75, max: 90, key: "khda_qdesc_most" as const },
  { min: 91, max: 100, key: "khda_qdesc_almost_all" as const },
];

export function quantitativeDescriptor(
  proportionPct: number | null,
  lang: Lang,
): string | null {
  if (proportionPct === null) return null;
  const rounded = Math.round(proportionPct);
  for (const row of QUANTITATIVE_DESCRIPTOR_KEYS) {
    if (rounded >= row.min && rounded <= row.max) {
      return translateKey(row.key, lang);
    }
  }
  return null;
}

export function formatKhdaPct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

/** English-first student display name (Honor Board policy). */
export function analyticsStudentEnglishName(profile: {
  english_name?: string | null;
  full_name?: string | null;
  arabic_name?: string | null;
}): string {
  return (
    profile.english_name?.trim() ||
    profile.full_name?.trim() ||
    profile.arabic_name?.trim() ||
    "—"
  );
}

/** Boundary values required by QA spec. */
export const KHDA_BOUNDARY_TEST_VALUES = [
  1, 15, 16, 50, 51, 61, 62, 71, 72, 75, 76, 81, 82, 91, 92, 100,
] as const;

export function runKhdaBoundarySelfTest(): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const expected: Array<[number, KhdaRating]> = [
    [1, 1], [15, 1], [16, 2], [50, 2], [51, 3], [61, 3], [62, 4], [71, 4],
    [72, 5], [75, 5], [76, 6], [81, 6], [82, 7], [91, 7], [92, 8], [100, 8],
  ];
  for (const [score, rating] of expected) {
    const got = khdaRatingFromScore(score);
    if (got !== rating) failures.push(`score ${score}: expected ${rating}, got ${got}`);
  }
  if (khdaRatingFromScore(0) !== 1) failures.push("score 0 with evidence should be Rating 1");
  if (khdaRatingFromScore(null) !== null) failures.push("null should stay null");
  return { pass: failures.length === 0, failures };
}
