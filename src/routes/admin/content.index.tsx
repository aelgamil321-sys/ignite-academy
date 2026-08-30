import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Loader2,
  Megaphone,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCMS } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";
import { useSchoolManagementPaths } from "@/lib/workspace-paths";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/content/")({
  head: () => ({
    meta: [
      { title: "Content Management — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminContentCenterPage,
});

type ExtraCounts = {
  quizSubmissions: number | null;
  assignments: number | null;
};

type ContentAction = {
  label: string;
  to: string;
  search?: Record<string, string>;
  primary?: boolean;
};

type ContentSection = {
  key: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  stats: Array<{ label: string; value: string }>;
  actions: ContentAction[];
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function ContentSectionCard({ section }: { section: ContentSection }) {
  const Icon = section.icon;
  return (
    <article className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)] flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl text-foreground">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </div>
      </div>

      {section.stats.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {section.stats.map((stat) => (
            <StatPill key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 mt-auto pt-1">
        {section.actions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            search={action.search ?? {}}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              action.primary
                ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                : "border border-border text-foreground hover:bg-muted",
            )}
          >
            {action.primary ? <Plus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

export function AdminContentCenterPage() {
  const { tr } = useI18n();
  const paths = useSchoolManagementPaths();
  const { lessons, articles, files, videos, loading: cmsLoading } = useCMS();
  const [extraCounts, setExtraCounts] = useState<ExtraCounts>({
    quizSubmissions: null,
    assignments: null,
  });
  const [extraLoading, setExtraLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.from("lesson_quiz_submissions").select("id", { count: "exact", head: true }),
      supabase.from("assignments").select("id", { count: "exact", head: true }),
    ]).then(([submissionsRes, assignmentsRes]) => {
      if (!active) return;
      setExtraCounts({
        quizSubmissions: submissionsRes.error ? null : (submissionsRes.count ?? 0),
        assignments: assignmentsRes.error ? null : (assignmentsRes.count ?? 0),
      });
      setExtraLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const publishedLessons = lessons.filter((lesson) => lesson.published).length;
    const lessonsWithQuiz = lessons.filter((lesson) => lesson.quiz.length > 0).length;
    const announcements = articles.filter((article) => article.category === "announcement").length;
    const publishedAnnouncements = articles.filter(
      (article) => article.category === "announcement" && article.published,
    ).length;
    const publishedVideos = videos.filter((video) => video.published).length;
    const publishedFiles = files.filter((file) => file.published).length;

    return {
      totalLessons: lessons.length,
      publishedLessons,
      lessonsWithQuiz,
      announcements,
      publishedAnnouncements,
      totalArticles: articles.length,
      videos: videos.length,
      publishedVideos,
      files: files.length,
      publishedFiles,
      resources: files.length + videos.length,
    };
  }, [lessons, articles, files, videos]);

  const sections: ContentSection[] = useMemo(
    () => [
      {
        key: "lessons",
        title: tr("admin_content_lessons_title"),
        description: tr("admin_content_lessons_desc"),
        icon: BookOpen,
        stats: [
          { label: tr("admin_content_total_lessons"), value: String(summary.totalLessons) },
          { label: tr("admin_content_published_lessons"), value: String(summary.publishedLessons) },
        ],
        actions: [
          { label: tr("admin_content_manage_lessons"), to: `${paths.base}/lessons` },
          paths.lead
            ? { label: tr("admin_content_add_lesson"), to: "/teacher/lessons/new", primary: true }
            : { label: tr("admin_content_add_lesson"), to: "/admin", search: { tab: "new-lesson" }, primary: true },
        ],
      },
      {
        key: "quizzes",
        title: tr("admin_content_quizzes_title"),
        description: tr("admin_content_quizzes_desc"),
        icon: ClipboardCheck,
        stats: [
          { label: tr("admin_content_lessons_with_quiz"), value: String(summary.lessonsWithQuiz) },
          ...(extraCounts.quizSubmissions !== null
            ? [{ label: tr("admin_content_quiz_submissions"), value: String(extraCounts.quizSubmissions) }]
            : []),
        ],
        actions: [
          paths.lead
            ? { label: tr("admin_content_manage_quizzes"), to: "/teacher/quizzes/manage" }
            : { label: tr("admin_content_manage_quizzes"), to: "/admin", search: { tab: "manage-quizzes" } },
          { label: tr("admin_content_quiz_submissions"), to: `${paths.base}/quiz-submissions` },
        ],
      },
      {
        key: "assignments",
        title: tr("admin_content_assignments_title"),
        description: tr("admin_content_assignments_desc"),
        icon: FileText,
        stats:
          extraCounts.assignments !== null
            ? [{ label: tr("admin_content_total_assignments"), value: String(extraCounts.assignments) }]
            : [],
        actions: [{ label: tr("admin_content_manage_assignments"), to: `${paths.base}/assignments`, primary: true }],
      },
      {
        key: "announcements",
        title: tr("admin_content_announcements_title"),
        description: tr("admin_content_announcements_desc"),
        icon: Megaphone,
        stats: [
          { label: tr("admin_content_announcements"), value: String(summary.announcements) },
          { label: tr("admin_content_published_announcements"), value: String(summary.publishedAnnouncements) },
        ],
        actions: [
          paths.lead
            ? { label: tr("admin_content_manage_announcements"), to: "/teacher/announcements" }
            : { label: tr("admin_content_manage_announcements"), to: "/admin", search: { tab: "manage-announcements" } },
          paths.lead
            ? { label: tr("admin_content_add_announcement"), to: "/teacher/articles/new", primary: true }
            : { label: tr("admin_content_add_announcement"), to: "/admin", search: { tab: "new-article" }, primary: true },
        ],
      },
      {
        key: "resources",
        title: tr("admin_content_resources_title"),
        description: tr("admin_content_resources_desc"),
        icon: FolderOpen,
        stats: [
          { label: tr("admin_content_videos"), value: String(summary.videos) },
          { label: tr("admin_content_files"), value: String(summary.files) },
        ],
        actions: [
          paths.lead
            ? { label: tr("admin_content_manage_resources"), to: "/teacher/resources" }
            : { label: tr("admin_content_manage_resources"), to: "/admin", search: { tab: "manage-resources" } },
          paths.lead
            ? { label: tr("admin_content_upload_file"), to: "/teacher/resources/new" }
            : { label: tr("admin_content_upload_file"), to: "/admin", search: { tab: "new-file" } },
          paths.lead
            ? { label: tr("admin_content_add_video"), to: "/teacher/videos/new", primary: true }
            : { label: tr("admin_content_add_video"), to: "/admin", search: { tab: "new-video" }, primary: true },
        ],
      },
    ],
    [tr, summary, extraCounts, paths],
  );

  if (cmsLoading || extraLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
        {tr("admin_content_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <ContentSectionCard key={section.key} section={section} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{tr("admin_content_legacy_note")}</p>
    </div>
  );
}
