import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Bi, QuizQuestion, Lesson } from "./curriculum";
import { grades } from "./curriculum";
import {
  type VideoItem, type Resource, type Announcement, type ParentGuide,
} from "./extras";
import { type SubjectCategory, subjectCategoryName } from "./categories";
import { gradeDisplayName, gradeMatches, normalizeGradeSlug } from "./grade-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---------- Types ----------
export interface CustomLesson {
  id: string;
  grade: string;
  unit: Bi;
  title: Bi;
  outcome: Bi;
  explanation: Bi;
  vocab: Bi;
  activity: Bi;
  worksheetText: Bi;
  youtubeUrl: string;
  pdfUrl?: string; pdfName?: string;
  pptUrl?: string; pptName?: string;
  worksheetUrl?: string; worksheetName?: string;
  quiz: QuizQuestion[];
  subjectCategory: SubjectCategory;
  published: boolean;
  createdAt: number;
}
export type VideoCategory = SubjectCategory;
export interface CustomVideo {
  id: string;
  title: Bi;
  description: Bi;
  grade: string;
  unit: Bi;
  category: VideoCategory;
  youtubeUrl: string;
  thumbnailUrl?: string;
  published: boolean;
  createdAt: number;
}
export type FileType = "pdf" | "ppt" | "worksheet" | "image";
export interface CustomFile {
  id: string;
  title: Bi;
  grade: string;
  unit: Bi;
  lesson: string;
  type: FileType;
  fileUrl: string;
  fileName: string;
  size: string;
  subjectCategory: SubjectCategory;
  published: boolean;
  createdAt: number;
}
export type ArticleCategory = "announcement" | "parent";
export interface CustomArticle {
  id: string;
  title: Bi;
  content: Bi;
  category: ArticleCategory;
  subjectCategory?: SubjectCategory;
  imageUrl?: string;
  grade?: string;
  unitSlug?: string;
  published: boolean;
  createdAt: number;
}

export interface CMSDebug {
  connected: boolean;
  lastTable: string;
  lastStatus: "idle" | "success" | "error";
  lastError: string;
  lastId: string;
  lastAction: string;
}
interface CMSState {
  lessons: CustomLesson[];
  videos: CustomVideo[];
  files: CustomFile[];
  articles: CustomArticle[];
  loading: boolean;
  debug: CMSDebug;
}
interface CMSCtx extends CMSState {
  addLesson: (l: Omit<CustomLesson, "id" | "createdAt">) => Promise<void>;
  updateLesson: (id: string, l: Partial<CustomLesson>) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  addVideo: (v: Omit<CustomVideo, "id" | "createdAt">) => Promise<void>;
  updateVideo: (id: string, v: Partial<CustomVideo>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  addFile: (f: Omit<CustomFile, "id" | "createdAt">) => Promise<void>;
  updateFile: (id: string, f: Partial<CustomFile>) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  addArticle: (a: Omit<CustomArticle, "id" | "createdAt">) => Promise<void>;
  updateArticle: (id: string, a: Partial<CustomArticle>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CMSCtx | null>(null);

function parseBi(raw: unknown): Bi {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return { en: String(o.en ?? ""), ar: String(o.ar ?? "") };
  }
  if (typeof raw === "string") {
    try {
      return parseBi(JSON.parse(raw));
    } catch {
      return { en: raw, ar: "" };
    }
  }
  return { en: "", ar: "" };
}

// ---------- Row <-> domain mapping ----------
type LessonRow = {
  id: string; grade: string; unit: Bi; title: Bi; outcome: Bi; explanation: Bi;
  vocab: Bi; activity: Bi; youtube_url: string;
  pdf_url: string | null; pdf_name: string | null;
  ppt_url: string | null; ppt_name: string | null;
  worksheet_url: string | null; worksheet_name: string | null;
  worksheet_text?: Bi | null;
  quiz: QuizQuestion[]; published: boolean; created_at: string;
  subject_category?: string | null;
};
const lessonFromRow = (r: LessonRow): CustomLesson => ({
  id: r.id,
  grade: normalizeGradeSlug(r.grade),
  unit: parseBi(r.unit),
  title: parseBi(r.title),
  outcome: parseBi(r.outcome),
  explanation: parseBi(r.explanation),
  vocab: parseBi(r.vocab),
  activity: parseBi(r.activity),
  worksheetText: parseBi(r.worksheet_text),
  youtubeUrl: r.youtube_url ?? "",
  pdfUrl: r.pdf_url ?? undefined, pdfName: r.pdf_name ?? undefined,
  pptUrl: r.ppt_url ?? undefined, pptName: r.ppt_name ?? undefined,
  worksheetUrl: r.worksheet_url ?? undefined, worksheetName: r.worksheet_name ?? undefined,
  quiz: Array.isArray(r.quiz) ? r.quiz : [],
  subjectCategory: ((r.subject_category ?? "quran") as SubjectCategory),
  published: r.published,
  createdAt: new Date(r.created_at).getTime(),
});
const lessonToRow = (l: Partial<CustomLesson>) => {
  const o: Record<string, unknown> = {};
  if (l.grade !== undefined) o.grade = normalizeGradeSlug(l.grade);
  if (l.unit !== undefined) o.unit = l.unit;
  if (l.title !== undefined) o.title = l.title;
  if (l.outcome !== undefined) o.outcome = l.outcome;
  if (l.explanation !== undefined) o.explanation = l.explanation;
  if (l.vocab !== undefined) o.vocab = l.vocab;
  if (l.activity !== undefined) o.activity = l.activity;
  if (l.worksheetText !== undefined) o.worksheet_text = l.worksheetText;
  if (l.youtubeUrl !== undefined) o.youtube_url = l.youtubeUrl;
  if (l.pdfUrl !== undefined) o.pdf_url = l.pdfUrl ?? null;
  if (l.pdfName !== undefined) o.pdf_name = l.pdfName ?? null;
  if (l.pptUrl !== undefined) o.ppt_url = l.pptUrl ?? null;
  if (l.pptName !== undefined) o.ppt_name = l.pptName ?? null;
  if (l.worksheetUrl !== undefined) o.worksheet_url = l.worksheetUrl ?? null;
  if (l.worksheetName !== undefined) o.worksheet_name = l.worksheetName ?? null;
  if (l.quiz !== undefined) o.quiz = l.quiz;
  if (l.subjectCategory !== undefined) o.subject_category = l.subjectCategory;
  if (l.published !== undefined) o.published = l.published;
  return o;
};

type VideoRow = {
  id: string; title: Bi; description: Bi; grade: string; unit: Bi;
  category: string | null;
  youtube_url: string; thumbnail_url: string | null; published: boolean; created_at: string;
};
const videoFromRow = (r: VideoRow): CustomVideo => ({
  id: r.id,
  title: parseBi(r.title),
  description: parseBi(r.description),
  grade: normalizeGradeSlug(r.grade),
  unit: parseBi(r.unit),
  category: ((r.category ?? "quran") as VideoCategory),
  youtubeUrl: r.youtube_url,
  thumbnailUrl: r.thumbnail_url ?? undefined,
  published: r.published,
  createdAt: new Date(r.created_at).getTime(),
});
const videoToRow = (v: Partial<CustomVideo>) => {
  const o: Record<string, unknown> = {};
  if (v.title !== undefined) o.title = v.title;
  if (v.description !== undefined) o.description = v.description;
  if (v.grade !== undefined) o.grade = normalizeGradeSlug(v.grade);
  if (v.unit !== undefined) o.unit = v.unit;
  if (v.category !== undefined) o.category = v.category;
  if (v.youtubeUrl !== undefined) o.youtube_url = v.youtubeUrl;
  if (v.thumbnailUrl !== undefined) o.thumbnail_url = v.thumbnailUrl ?? null;
  if (v.published !== undefined) o.published = v.published;
  return o;
};

type FileRow = {
  id: string; title: Bi; grade: string; unit: Bi; lesson: string; type: string;
  file_url: string; file_name: string; size: string; published: boolean; created_at: string;
  subject_category?: string | null;
};
const fileFromRow = (r: FileRow): CustomFile => ({
  id: r.id,
  title: parseBi(r.title),
  grade: normalizeGradeSlug(r.grade),
  unit: parseBi(r.unit),
  lesson: r.lesson,
  type: r.type as FileType,
  fileUrl: r.file_url,
  fileName: r.file_name,
  size: r.size,
  subjectCategory: ((r.subject_category ?? "quran") as SubjectCategory),
  published: r.published,
  createdAt: new Date(r.created_at).getTime(),
});
const fileToRow = (f: Partial<CustomFile>) => {
  const o: Record<string, unknown> = {};
  if (f.title !== undefined) o.title = f.title;
  if (f.grade !== undefined) o.grade = normalizeGradeSlug(f.grade);
  if (f.unit !== undefined) o.unit = f.unit;
  if (f.lesson !== undefined) o.lesson = f.lesson;
  if (f.type !== undefined) o.type = f.type;
  if (f.fileUrl !== undefined) o.file_url = f.fileUrl;
  if (f.fileName !== undefined) o.file_name = f.fileName;
  if (f.size !== undefined) o.size = f.size;
  if (f.subjectCategory !== undefined) o.subject_category = f.subjectCategory;
  if (f.published !== undefined) o.published = f.published;
  return o;
};

type ArticleRow = {
  id: string; title: Bi; content: Bi; category: string; image_url: string | null;
  grade: string | null; unit_slug: string | null;
  subject_category?: string | null;
  published: boolean; created_at: string;
};
const articleFromRow = (r: ArticleRow): CustomArticle => ({
  id: r.id,
  title: parseBi(r.title),
  content: parseBi(r.content),
  category: r.category as ArticleCategory,
  subjectCategory: r.subject_category ? (r.subject_category as SubjectCategory) : undefined,
  imageUrl: r.image_url ?? undefined,
  grade: r.grade ? normalizeGradeSlug(r.grade) : undefined,
  unitSlug: r.unit_slug ?? undefined,
  published: r.published,
  createdAt: new Date(r.created_at).getTime(),
});
const articleToRow = (a: Partial<CustomArticle>) => {
  const o: Record<string, unknown> = {};
  if (a.title !== undefined) o.title = a.title;
  if (a.content !== undefined) o.content = a.content;
  if (a.category !== undefined) o.category = a.category;
  if (a.subjectCategory !== undefined) o.subject_category = a.subjectCategory ?? "";
  if (a.imageUrl !== undefined) o.image_url = a.imageUrl ?? null;
  if (a.grade !== undefined) o.grade = a.grade ? normalizeGradeSlug(a.grade) : "";
  if (a.unitSlug !== undefined) o.unit_slug = a.unitSlug ?? "";
  if (a.published !== undefined) o.published = a.published;
  return o;
};

// ---------- Provider ----------
export function CMSProvider({ children }: { children: ReactNode }) {
  const [lessons, setLessons] = useState<CustomLesson[]>([]);
  const [videos, setVideos] = useState<CustomVideo[]>([]);
  const [files, setFiles] = useState<CustomFile[]>([]);
  const [articles, setArticles] = useState<CustomArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<CMSDebug>({
    connected: false, lastTable: "—", lastStatus: "idle",
    lastError: "", lastId: "", lastAction: "—",
  });

  const refresh = async () => {
    try {
      const [l, v, f, a] = await Promise.all([
        supabase.from("lessons").select("*").order("created_at", { ascending: false }),
        supabase.from("videos").select("*").order("created_at", { ascending: false }),
        supabase.from("files").select("*").order("created_at", { ascending: false }),
        supabase.from("articles").select("*").order("created_at", { ascending: false }),
      ]);
      if (l.error) throw l.error;
      if (v.error) throw v.error;
      if (f.error) throw f.error;
      if (a.error) throw a.error;
      setLessons(((l.data ?? []) as unknown as LessonRow[]).map(lessonFromRow));
      setVideos(((v.data ?? []) as unknown as VideoRow[]).map(videoFromRow));
      setFiles(((f.data ?? []) as unknown as FileRow[]).map(fileFromRow));
      setArticles(((a.data ?? []) as unknown as ArticleRow[]).map(articleFromRow));
      setDebug((d) => ({ ...d, connected: true }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[CMS] load failed", e);
      toast.error(`Could not load content: ${msg}`);
      setDebug((d) => ({ ...d, connected: false, lastStatus: "error", lastError: msg }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  async function run<T>(table: string, action: string, fn: () => Promise<{ data: T | null; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await fn();
    if (error || !data) {
      const msg = error?.message ?? "No data returned";
      toast.error(`${action} ${table} failed: ${msg}`);
      setDebug({ connected: true, lastTable: table, lastStatus: "error", lastError: msg, lastId: "", lastAction: action });
      throw new Error(msg);
    }
    const id = (data as { id?: string }).id ?? "";
    setDebug({ connected: true, lastTable: table, lastStatus: "success", lastError: "", lastId: id, lastAction: action });
    return data;
  }

  const addLesson = async (l: Omit<CustomLesson, "id" | "createdAt">) => {
    const row = await run<LessonRow>("lessons", "insert", () =>
      supabase.from("lessons").insert(lessonToRow(l) as never).select().single() as never);
    setLessons((s) => [lessonFromRow(row), ...s]);
  };
  const updateLesson = async (id: string, l: Partial<CustomLesson>) => {
    const row = await run<LessonRow>("lessons", "update", () =>
      supabase.from("lessons").update(lessonToRow(l) as never).eq("id", id).select().single() as never);
    setLessons((s) => s.map((x) => x.id === id ? lessonFromRow(row) : x));
  };
  const deleteLesson = async (id: string) => {
    await run<{ id: string }>("lessons", "delete", async () => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      return { data: error ? null : { id }, error };
    });
    setLessons((s) => s.filter((x) => x.id !== id));
  };

  const addVideo = async (v: Omit<CustomVideo, "id" | "createdAt">) => {
    const row = await run<VideoRow>("videos", "insert", () =>
      supabase.from("videos").insert(videoToRow(v) as never).select().single() as never);
    setVideos((s) => [videoFromRow(row), ...s]);
  };
  const updateVideo = async (id: string, v: Partial<CustomVideo>) => {
    const row = await run<VideoRow>("videos", "update", () =>
      supabase.from("videos").update(videoToRow(v) as never).eq("id", id).select().single() as never);
    setVideos((s) => s.map((x) => x.id === id ? videoFromRow(row) : x));
  };
  const deleteVideo = async (id: string) => {
    await run<{ id: string }>("videos", "delete", async () => {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      return { data: error ? null : { id }, error };
    });
    setVideos((s) => s.filter((x) => x.id !== id));
  };

  const addFile = async (f: Omit<CustomFile, "id" | "createdAt">) => {
    const row = await run<FileRow>("files", "insert", () =>
      supabase.from("files").insert(fileToRow(f) as never).select().single() as never);
    setFiles((s) => [fileFromRow(row), ...s]);
  };
  const updateFile = async (id: string, f: Partial<CustomFile>) => {
    const row = await run<FileRow>("files", "update", () =>
      supabase.from("files").update(fileToRow(f) as never).eq("id", id).select().single() as never);
    setFiles((s) => s.map((x) => x.id === id ? fileFromRow(row) : x));
  };
  const deleteFile = async (id: string) => {
    await run<{ id: string }>("files", "delete", async () => {
      const { error } = await supabase.from("files").delete().eq("id", id);
      return { data: error ? null : { id }, error };
    });
    setFiles((s) => s.filter((x) => x.id !== id));
  };

  const addArticle = async (a: Omit<CustomArticle, "id" | "createdAt">) => {
    const row = await run<ArticleRow>("articles", "insert", () =>
      supabase.from("articles").insert(articleToRow(a) as never).select().single() as never);
    setArticles((s) => [articleFromRow(row), ...s]);
  };
  const updateArticle = async (id: string, a: Partial<CustomArticle>) => {
    const row = await run<ArticleRow>("articles", "update", () =>
      supabase.from("articles").update(articleToRow(a) as never).eq("id", id).select().single() as never);
    setArticles((s) => s.map((x) => x.id === id ? articleFromRow(row) : x));
  };
  const deleteArticle = async (id: string) => {
    await run<{ id: string }>("articles", "delete", async () => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      return { data: error ? null : { id }, error };
    });
    setArticles((s) => s.filter((x) => x.id !== id));
  };

  const value: CMSCtx = {
    lessons, videos, files, articles, loading, debug,
    addLesson, updateLesson, deleteLesson,
    addVideo, updateVideo, deleteVideo,
    addFile, updateFile, deleteFile,
    addArticle, updateArticle, deleteArticle,
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCMS() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCMS must be used inside CMSProvider");
  return c;
}

export function ytId(url: string): string {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : url.trim();
}

function vocabFromBi(b: Bi): Array<{ term: Bi; def: Bi }> {
  const en = (b.en ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const ar = (b.ar ?? "").split(/[,،;؛]/).map((s) => s.trim()).filter(Boolean);
  const n = Math.max(en.length, ar.length);
  if (n === 0) return [];
  return Array.from({ length: n }, (_, i) => ({
    term: { en: en[i] ?? "", ar: ar[i] ?? "" },
    def: { en: "", ar: "" },
  }));
}

export function customToLesson(c: CustomLesson, lang: "en" | "ar" = "en"): Lesson {
  const subjectName = subjectCategoryName(c.subjectCategory, lang);
  const subjectAr = subjectCategoryName(c.subjectCategory, "ar");
  return {
    slug: c.id,
    title: c.title,
    subject: { en: subjectName, ar: subjectAr },
    unit: c.unit,
    duration: 0,
    outcome: c.outcome,
    explanation: c.explanation,
    vocab: vocabFromBi(c.vocab),
    activity: c.activity,
    worksheet: c.worksheetText,
    videoTitle: c.title,
    quiz: c.quiz ?? [],
  };
}

export function useLessonsForGrade(gradeSlug: string) {
  const { lessons } = useCMS();
  return lessons
    .filter((l) => l.published && gradeMatches(l.grade, gradeSlug))
    .map((l) => customToLesson(l));
}

export function useResolveLesson(gradeSlug: string, lessonSlug: string) {
  const { lessons, files, loading } = useCMS();
  const grade = getGradeFromSlug(gradeSlug);
  if (!grade) return null;
  const customRaw = lessons.find(
    (l) => l.id === lessonSlug && gradeMatches(l.grade, gradeSlug),
  );
  const lesson = customRaw ? customToLesson(customRaw) : undefined;
  const lessonFiles = files.filter(
    (f) => f.published && f.lesson === lessonSlug && gradeMatches(f.grade, gradeSlug),
  );
  return { grade, lesson, custom: customRaw, lessonFiles, loading };
}

function getGradeFromSlug(gradeSlug: string) {
  return grades.find((g) => g.slug === normalizeGradeSlug(gradeSlug));
}

export type UnifiedVideo = VideoItem & { category?: VideoCategory; _custom?: { thumbnailUrl?: string } };
export type UnifiedResource = Resource & { _url?: string; _fileName?: string; subjectCategory?: SubjectCategory };
export type UnifiedAnnouncement = Announcement;
export type UnifiedParentGuide = ParentGuide;

export function useAllVideos(): UnifiedVideo[] {
  const { videos } = useCMS();
  return videos
    .filter((v) => v.published)
    .map((v) => ({
      slug: v.id,
      title: v.title,
      description: v.description,
      grade: { en: gradeDisplayName(v.grade, "en"), ar: gradeDisplayName(v.grade, "ar") },
      duration: "",
      youtubeId: ytId(v.youtubeUrl),
      category: v.category,
      _custom: { thumbnailUrl: v.thumbnailUrl },
      _gradeSlug: v.grade,
    }));
}

export function useAllResources(): UnifiedResource[] {
  const { files } = useCMS();
  return files
    .filter((f) => f.published)
    .map((f) => ({
      slug: f.id,
      title: f.title,
      type: (f.type === "image" ? "pdf" : f.type) as Resource["type"],
      grade: { en: gradeDisplayName(f.grade, "en"), ar: gradeDisplayName(f.grade, "ar") },
      subject: f.unit?.en || f.unit?.ar
        ? f.unit
        : { en: subjectCategoryName(f.subjectCategory, "en"), ar: subjectCategoryName(f.subjectCategory, "ar") },
      size: f.size,
      _url: f.fileUrl,
      _fileName: f.fileName,
      subjectCategory: f.subjectCategory,
      _gradeSlug: f.grade,
    }));
}

export function useAllAnnouncements(): UnifiedAnnouncement[] {
  const { articles } = useCMS();
  return articles
    .filter((a) => a.published && a.category === "announcement")
    .map((a) => ({
      slug: a.id,
      date: new Date(a.createdAt).toLocaleDateString(),
      tag: { en: "News", ar: "خبر" },
      title: a.title,
      excerpt: { en: a.content.en.slice(0, 160), ar: a.content.ar.slice(0, 160) },
      body: a.content,
    }));
}

export function useAllParentGuides(): UnifiedParentGuide[] {
  const { articles } = useCMS();
  return articles
    .filter((a) => a.published && a.category === "parent")
    .map((a) => ({
      slug: a.id,
      title: a.title,
      excerpt: { en: a.content.en.slice(0, 160), ar: a.content.ar.slice(0, 160) },
      body: a.content,
    }));
}

export function useQuizzesFromCMS() {
  const { lessons } = useCMS();
  return lessons
    .filter((l) => l.published && l.quiz.length > 0)
    .map((l) => ({
      slug: l.id,
      title: l.title,
      description: l.outcome,
      grade: { en: gradeDisplayName(l.grade, "en"), ar: gradeDisplayName(l.grade, "ar") },
      questions: l.quiz,
      _gradeSlug: l.grade,
    }));
}

export function useContentByCategory(category: SubjectCategory) {
  const { lessons, videos, files, articles } = useCMS();
  const pubLessons = lessons.filter((l) => l.published && l.subjectCategory === category);
  const pubVideos = videos.filter((v) => v.published && v.category === category);
  const pubFiles = files.filter((f) => f.published && f.subjectCategory === category);
  const pubArticles = articles.filter(
    (a) => a.published && a.subjectCategory === category && a.category !== "parent",
  );
  return { lessons: pubLessons, videos: pubVideos, files: pubFiles, articles: pubArticles };
}

export function useCMSStats() {
  const { lessons, videos, files, articles } = useCMS();
  return {
    lessonCount: lessons.filter((l) => l.published).length,
    videoCount: videos.filter((v) => v.published).length,
    fileCount: files.filter((f) => f.published).length,
    articleCount: articles.filter((a) => a.published).length,
    gradeCount: 14,
    subjectCount: 6,
  };
}
