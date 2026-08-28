import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import {
  fetchTeacherIncomingAnnouncements,
  fetchTeacherMyAnnouncements,
  type TeacherDashboardAnnouncement,
} from "@/lib/teacher-dashboard-announcements";
import { announcementAudienceLabel } from "@/lib/announcement-audience";
import { ANNOUNCEMENT_TOPIC_LABELS } from "@/lib/announcement-topics";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";
import { sectionLabel } from "@/lib/student-academics";
import { cn } from "@/lib/utils";

type AnnouncementTab = "incoming" | "mine";

function formatAnnouncementDate(iso: string, lang: "en" | "ar"): string {
  try {
    return new Date(iso).toLocaleDateString(localeForFormatting(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function announcementExcerpt(announcement: TeacherDashboardAnnouncement, lang: "en" | "ar"): string {
  const text = (lang === "ar" ? announcement.content.ar : announcement.content.en) || announcement.content.en || announcement.content.ar;
  return text.replace(/\s+/g, " ").trim().slice(0, 110);
}

function announcementTitle(announcement: TeacherDashboardAnnouncement, lang: "en" | "ar"): string {
  return (lang === "ar" ? announcement.title.ar : announcement.title.en) || announcement.title.en || announcement.title.ar;
}

export type TeacherAnnouncementsPanelProps = {
  teacherUserId: string;
};

export function TeacherAnnouncementsPanel({ teacherUserId }: TeacherAnnouncementsPanelProps) {
  const { tr, bi, lang } = useI18n();
  const [tab, setTab] = useState<AnnouncementTab>("incoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [incoming, setIncoming] = useState<TeacherDashboardAnnouncement[]>([]);
  const [mine, setMine] = useState<TeacherDashboardAnnouncement[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void Promise.all([
      fetchTeacherIncomingAnnouncements(teacherUserId),
      fetchTeacherMyAnnouncements(teacherUserId),
    ])
      .then(([incomingRows, mineRows]) => {
        if (!active) return;
        setIncoming(incomingRows);
        setMine(mineRows);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teacherUserId]);

  const visible = tab === "incoming" ? incoming : mine;

  const targetingSummary = useMemo(
    () => (announcement: TeacherDashboardAnnouncement) => {
      const parts: string[] = [];
      if (announcement.grade) parts.push(gradeDisplayName(announcement.grade, lang));
      if (announcement.targetSection) parts.push(sectionLabel(announcement.targetSection, lang));
      if (announcement.audience) parts.push(bi(announcementAudienceLabel(announcement.audience)));
      return parts.join(" · ");
    },
    [bi, lang],
  );

  return (
    <TeacherDashboardSection
      title={tr("teacher_dash_section_announcements")}
      icon={<Megaphone className="h-5 w-5" />}
      action={
        <Link
          to="/teacher/announcements/new"
          className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          {tr("teacher_dash_ann_create")}
        </Link>
      }
    >
      <div className="mb-4 flex min-w-0 gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {(["incoming", "mine"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "min-h-11 flex-1 rounded-lg px-2 text-xs font-semibold transition-colors sm:text-sm",
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tr(key === "incoming" ? "teacher_dash_ann_tab_incoming" : "teacher_dash_ann_tab_mine")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
        </div>
      ) : error ? (
        <p className="py-4 text-sm text-muted-foreground">{tr("teacher_dash_widget_load_error")}</p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {tr(tab === "incoming" ? "teacher_dash_ann_incoming_empty" : "teacher_dash_ann_mine_empty")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((announcement) => (
            <li
              key={announcement.id}
              className="min-w-0 rounded-xl border border-border bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 font-semibold leading-snug text-foreground">
                  {announcementTitle(announcement, lang)}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatAnnouncementDate(announcement.createdAt, lang)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {announcementExcerpt(announcement, lang)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {announcement.topic ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-foreground">
                    {bi(ANNOUNCEMENT_TOPIC_LABELS[announcement.topic])}
                  </span>
                ) : null}
                {tab === "incoming" && announcement.sourceLabelKey ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {tr(announcement.sourceLabelKey)}
                  </span>
                ) : null}
                {tab === "mine" ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      announcement.published
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {announcement.published ? tr("teacher_published") : tr("teacher_draft")}
                  </span>
                ) : null}
              </div>
              {tab === "mine" && targetingSummary(announcement) ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{targetingSummary(announcement)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to="/teacher/announcements"
          className="text-sm font-semibold text-primary hover:underline"
        >
          {tr("view_all")}
        </Link>
      </div>
    </TeacherDashboardSection>
  );
}
