import { supabase } from "@/integrations/supabase/client";
import type { AnnouncementAudience } from "@/lib/announcement-audience";
import type { AnnouncementTopic } from "@/lib/announcement-topics";
import type { CustomArticle } from "@/lib/cms";
import type { Bi } from "@/lib/curriculum";
import type { Announcement } from "@/lib/extras";
import { resolveAnnouncementBySlug } from "@/lib/parent-workspace-content";
import { normalizeStudentSection, type StudentSection } from "@/lib/student-academics";
import { announcementTopicLabel, inferAnnouncementTopic } from "@/lib/announcement-topics";

const PREVIEW_LIMIT = 3;

type ArticleRow = {
  id: string;
  title: unknown;
  content: unknown;
  category: string;
  grade: string | null;
  target_section: string | null;
  audience: string | null;
  announcement_topic: string | null;
  published: boolean;
  created_by: string | null;
  created_at: string;
  image_url?: string | null;
};

export type TeacherDashboardAnnouncement = {
  id: string;
  title: Bi;
  content: Bi;
  published: boolean;
  createdAt: string;
  topic: AnnouncementTopic | null;
  audience: AnnouncementAudience | null;
  grade: string | null;
  targetSection: StudentSection | null;
  createdBy: string | null;
  sourceLabelKey: "teacher_dash_ann_source_admin" | null;
};

function parseBi(raw: unknown): Bi {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    return { en: String(record.en ?? ""), ar: String(record.ar ?? "") };
  }
  return { en: String(raw ?? ""), ar: String(raw ?? "") };
}

function rowToAnnouncement(row: ArticleRow): TeacherDashboardAnnouncement {
  return {
    id: row.id,
    title: parseBi(row.title),
    content: parseBi(row.content),
    published: Boolean(row.published),
    createdAt: row.created_at,
    topic: (row.announcement_topic as AnnouncementTopic | null) ?? null,
    audience: (row.audience as AnnouncementAudience | null) ?? null,
    grade: row.grade,
    targetSection: normalizeStudentSection(row.target_section),
    createdBy: row.created_by,
    sourceLabelKey: null,
  };
}

export async function fetchTeacherIncomingAnnouncements(
  teacherUserId: string,
): Promise<TeacherDashboardAnnouncement[]> {
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, content, category, grade, target_section, audience, announcement_topic, published, created_by, created_at",
    )
    .eq("category", "announcement")
    .eq("published", true)
    .in("audience", ["all", "teachers"])
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT + 5);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.created_by !== teacherUserId)
    .slice(0, PREVIEW_LIMIT)
    .map((row) => ({
      ...rowToAnnouncement(row as ArticleRow),
      sourceLabelKey: "teacher_dash_ann_source_admin",
    }));
}

export async function fetchTeacherMyAnnouncements(
  teacherUserId: string,
): Promise<TeacherDashboardAnnouncement[]> {
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, content, category, grade, target_section, audience, announcement_topic, published, created_by, created_at",
    )
    .eq("category", "announcement")
    .eq("created_by", teacherUserId)
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT);

  if (error) throw error;

  return (data ?? []).map((row) => rowToAnnouncement(row as ArticleRow));
}

const ARTICLE_DETAIL_SELECT =
  "id, title, content, category, grade, target_section, audience, announcement_topic, published, created_by, created_at, image_url";

function articleRowToCustomArticle(row: ArticleRow): CustomArticle {
  return {
    id: row.id,
    title: parseBi(row.title),
    content: parseBi(row.content),
    category: "announcement",
    imageUrl: row.image_url ?? undefined,
    grade: row.grade ?? undefined,
    published: row.published,
    createdAt: new Date(row.created_at).getTime(),
    createdBy: row.created_by,
    targetSection: normalizeStudentSection(row.target_section),
    audience: (row.audience as AnnouncementAudience | null) ?? null,
    announcementTopic: (row.announcement_topic as AnnouncementTopic | null) ?? null,
  };
}

function customArticleToAnnouncement(custom: CustomArticle): Announcement {
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

/** Read-only announcement detail for teacher workspace — RLS enforces targeting/ownership. */
export async function fetchTeacherReadableAnnouncement(articleId: string): Promise<{
  announcement: Announcement | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_DETAIL_SELECT)
    .eq("id", articleId)
    .eq("category", "announcement")
    .maybeSingle();

  if (error) return { announcement: null, error: error.message };
  if (!data) return { announcement: null, error: null };

  const custom = articleRowToCustomArticle(data as ArticleRow);
  const publishedAnnouncement = resolveAnnouncementBySlug(articleId, [custom]);
  if (publishedAnnouncement) {
    return { announcement: publishedAnnouncement, error: null };
  }

  if (!custom.published) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user?.id && custom.createdBy === auth.user.id) {
      return { announcement: customArticleToAnnouncement(custom), error: null };
    }
  }

  return { announcement: null, error: null };
}
