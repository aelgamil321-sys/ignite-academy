import type { Bi } from "@/lib/curriculum";
import type { Announcement } from "@/lib/extras";
import type { CustomLesson } from "@/lib/cms";
import { SUBJECT_CATEGORIES } from "@/lib/categories";
import { announcementTopicLabel } from "@/lib/announcement-topics";
import { grades } from "@/lib/curriculum";
import type { Lang } from "@/lib/i18n-config";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import {
  biSourceForTranslation,
  prefetchEducationalTranslations,
  type EducationalContentType,
  type EducationalField,
} from "@/lib/translate-educational-content";

function fieldFromBi(
  bi: Bi,
  lang: Lang,
  fieldName: string,
  contentType: EducationalContentType,
  lessonId?: string,
): EducationalField | null {
  const source = biSourceForTranslation(bi, lang);
  if (!source) return null;
  return {
    fieldName,
    contentType,
    text: source.text,
    sourceLanguage: source.sourceLanguage,
    lessonId,
  };
}

function lessonFields(lesson: CustomLesson, lang: Lang): EducationalField[] {
  const id = lesson.id;
  const fields: EducationalField[] = [];

  const push = (bi: Bi, fieldName: string, contentType: EducationalContentType) => {
    const f = fieldFromBi(bi, lang, fieldName, contentType, id);
    if (f) fields.push(f);
  };

  push(lesson.title, "title", "title");
  push(lesson.unit, "unit", "general");
  push(lesson.outcome, "outcome", "outcome");
  push(lesson.explanation, "explanation", "content");

  for (const [i, item] of lesson.vocab.entries()) {
    push(item.word, `vocab_term_${i}`, "vocab_term");
    push(item.meaning, `vocab_def_${i}`, "vocab_def");
  }

  for (const [qi, q] of normalizeQuizList(lesson.quiz).entries()) {
    push(q.q, `quiz_q_${qi}`, "quiz_question");
    for (const [oi, opt] of q.options.entries()) {
      push(opt, `quiz_q_${qi}_opt_${oi}`, "quiz_option");
    }
  }

  return fields;
}

function announcementFields(announcement: Announcement, lang: Lang): EducationalField[] {
  const id = announcement.slug;
  const fields: EducationalField[] = [];
  const push = (bi: Bi, fieldName: string, contentType: EducationalContentType) => {
    const f = fieldFromBi(bi, lang, fieldName, contentType, id);
    if (f) fields.push(f);
  };
  push(announcement.title, "title", "title");
  push(announcement.excerpt, "excerpt", "content");
  push(announcement.tag, "tag", "general");
  return fields;
}

/** Prefetch all translatable CMS strings visible on the homepage. */
export function prefetchHomepageContent(
  lang: Lang,
  lessons: CustomLesson[],
  announcements: Announcement[],
): void {
  const fields: EducationalField[] = [];

  for (const cat of SUBJECT_CATEGORIES) {
    const name = fieldFromBi(cat.name, lang, `cat_${cat.slug}_name`, "general", `cat_${cat.slug}`);
    const desc = fieldFromBi(cat.desc, lang, `cat_${cat.slug}_desc`, "general", `cat_${cat.slug}`);
    if (name) fields.push(name);
    if (desc) fields.push(desc);
  }

  for (const g of grades) {
    const f = fieldFromBi(g.name, lang, `grade_${g.slug}`, "general", `grade_${g.slug}`);
    if (f) fields.push(f);
  }

  for (const topic of ["school_news", "exams", "events", "parents"] as const) {
    const f = fieldFromBi(announcementTopicLabel(topic), lang, `ann_topic_${topic}`, "general", "announcements");
    if (f) fields.push(f);
  }

  for (const lesson of lessons) {
    fields.push(...lessonFields(lesson, lang));
  }

  for (const ann of announcements) {
    fields.push(...announcementFields(ann, lang));
  }

  prefetchEducationalTranslations("_homepage", fields, lang);
}

/** Prefetch lesson list content for a grade page. */
export function prefetchGradePageContent(lang: Lang, lessons: CustomLesson[]): void {
  const fields = lessons.flatMap((l) => lessonFields(l, lang));
  prefetchEducationalTranslations("_grades", fields, lang);
}

/** Prefetch a single category page and its linked content. */
export function prefetchCategoryPageContent(
  lang: Lang,
  categorySlug: string,
  lessons: CustomLesson[],
  extras?: { title: Bi; excerpt: Bi }[],
): void {
  const fields: EducationalField[] = [];
  const cat = SUBJECT_CATEGORIES.find((c) => c.slug === categorySlug);
  if (cat) {
    const name = fieldFromBi(cat.name, lang, `cat_${cat.slug}_name`, "general", `cat_${cat.slug}`);
    const desc = fieldFromBi(cat.desc, lang, `cat_${cat.slug}_desc`, "general", `cat_${cat.slug}`);
    if (name) fields.push(name);
    if (desc) fields.push(desc);
  }
  for (const lesson of lessons) {
    fields.push(...lessonFields(lesson, lang));
  }
  for (const [i, item] of (extras ?? []).entries()) {
    const t = fieldFromBi(item.title, lang, `extra_title_${i}`, "title", categorySlug);
    const e = fieldFromBi(item.excerpt, lang, `extra_excerpt_${i}`, "content", categorySlug);
    if (t) fields.push(t);
    if (e) fields.push(e);
  }
  prefetchEducationalTranslations(`_cat_${categorySlug}`, fields, lang);
}

/** Prefetch announcement list / detail content. */
export function prefetchAnnouncementsContent(lang: Lang, announcements: Announcement[]): void {
  const fields = announcements.flatMap((a) => announcementFields(a, lang));
  prefetchEducationalTranslations("_announcements", fields, lang);
}
