import type { Bi } from "@/lib/curriculum";

export type AnnouncementTopic = "school_news" | "exams" | "events" | "parents";

export const ANNOUNCEMENT_TOPIC_LABELS: Record<AnnouncementTopic, Bi> = {
  school_news: { en: "School News", ar: "أخبار المدرسة" },
  exams: { en: "Exams", ar: "الاختبارات" },
  events: { en: "Events", ar: "الفعاليات" },
  parents: { en: "Parents", ar: "أولياء الأمور" },
};

/** Infer display topic from announcement text (until a dedicated DB field exists). */
export function inferAnnouncementTopic(
  title: Bi,
  content: Bi,
  articleCategory?: string,
): AnnouncementTopic {
  const text = `${title.en} ${title.ar} ${content.en} ${content.ar}`.toLowerCase();

  if (/exam|assessment|mid-?term|اختبار|امتحان|تقييم|جدول/.test(text)) {
    return "exams";
  }
  if (/competition|event|مسابقة|فعالية|حفل|بطولة|recitation/.test(text)) {
    return "events";
  }
  if (/parent|ولي|أولياء|parents/.test(text) || articleCategory === "parent") {
    return "parents";
  }
  return "school_news";
}

export function announcementTopicLabel(topic: AnnouncementTopic): Bi {
  return ANNOUNCEMENT_TOPIC_LABELS[topic];
}
