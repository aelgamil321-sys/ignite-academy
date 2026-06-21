import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import {
  prefetchAnnouncementsContent,
  prefetchCategoryPageContent,
  prefetchGradePageContent,
  prefetchHomepageContent,
} from "@/lib/cms-content-prefetch";
import type { Announcement } from "@/lib/extras";
import type { CustomLesson } from "@/lib/cms";
import type { Bi } from "@/lib/curriculum";
import { needsDynamicTranslation } from "@/lib/translate-educational-content";

export function useHomepageContentPrefetch(
  lessons: CustomLesson[],
  announcements: Announcement[],
) {
  const { lang } = useI18n();
  useEffect(() => {
    if (!needsDynamicTranslation(lang)) return;
    prefetchHomepageContent(lang, lessons, announcements);
  }, [lang, lessons, announcements]);
}

export function useGradeContentPrefetch(lessons: CustomLesson[]) {
  const { lang } = useI18n();
  useEffect(() => {
    if (!needsDynamicTranslation(lang)) return;
    prefetchGradePageContent(lang, lessons);
  }, [lang, lessons]);
}

export function useCategoryContentPrefetch(
  categorySlug: string,
  lessons: CustomLesson[],
  extras?: { title: Bi; excerpt: Bi }[],
) {
  const { lang } = useI18n();
  useEffect(() => {
    if (!needsDynamicTranslation(lang)) return;
    prefetchCategoryPageContent(lang, categorySlug, lessons, extras);
  }, [lang, categorySlug, lessons, extras]);
}

export function useAnnouncementsContentPrefetch(announcements: Announcement[]) {
  const { lang } = useI18n();
  useEffect(() => {
    if (!needsDynamicTranslation(lang)) return;
    prefetchAnnouncementsContent(lang, announcements);
  }, [lang, announcements]);
}
