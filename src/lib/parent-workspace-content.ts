import type { Announcement, ParentGuide } from "@/lib/extras";
import { getAnnouncement, getParentGuide } from "@/lib/extras";
import { announcementTopicLabel, inferAnnouncementTopic } from "@/lib/announcement-topics";
import type { CustomArticle } from "@/lib/cms";

export function resolveAnnouncementBySlug(
  slug: string,
  articles: CustomArticle[],
): Announcement | null {
  const builtIn = getAnnouncement(slug);
  if (builtIn) return builtIn;

  const custom = articles.find((a) => a.id === slug && a.published && a.category === "announcement");
  if (!custom) return null;

  const topic = inferAnnouncementTopic(custom.title, custom.content, custom.category);
  return {
    slug: custom.id,
    createdAt: custom.createdAt,
    date: new Date(custom.createdAt).toLocaleDateString(),
    topic,
    tag: announcementTopicLabel(topic),
    title: custom.title,
    excerpt: {
      en: custom.content.en.slice(0, 160),
      ar: custom.content.ar.slice(0, 160),
    },
    body: custom.content,
    imageUrl: custom.imageUrl,
  };
}

export function resolveParentGuideBySlug(
  slug: string,
  articles: CustomArticle[],
): (ParentGuide & { imageUrl?: string; createdAt?: number }) | null {
  const builtIn = getParentGuide(slug);
  if (builtIn) {
    return {
      ...builtIn,
      imageUrl: (builtIn as { image?: string }).image,
    };
  }

  const custom = articles.find((a) => a.id === slug && a.published && a.category === "parent");
  if (!custom) return null;

  return {
    slug: custom.id,
    title: custom.title,
    excerpt: {
      en: custom.content.en.slice(0, 160),
      ar: custom.content.ar.slice(0, 160),
    },
    body: custom.content,
    imageUrl: custom.imageUrl,
    createdAt: custom.createdAt,
  };
}
