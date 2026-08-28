import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Megaphone,
} from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import {
  fetchTeacherActivityFeed,
  type TeacherActivityItem,
  type TeacherActivityType,
} from "@/lib/teacher-activity-feed";
import type { ScopedStudentRow, TeacherContext } from "@/lib/teacher-dashboard";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";

const TYPE_ICONS: Record<TeacherActivityType, typeof Activity> = {
  quiz_submission: ClipboardCheck,
  assignment_submission: GraduationCap,
  lesson_published: BookOpen,
  weekly_plan_update: CalendarDays,
  announcement_created: Megaphone,
};

function formatActivityDate(iso: string, lang: "en" | "ar"): string {
  try {
    return new Date(iso).toLocaleDateString(localeForFormatting(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export type TeacherRecentActivityProps = {
  context: TeacherContext;
  students: ScopedStudentRow[];
};

export function TeacherRecentActivity({ context, students }: TeacherRecentActivityProps) {
  const { tr, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<TeacherActivityItem[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void fetchTeacherActivityFeed(context, students, lang)
      .then((result) => {
        if (!active) return;
        setItems(result);
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
  }, [context, students, lang]);

  return (
    <TeacherDashboardSection
      title={tr("teacher_dash_section_recent_activity")}
      icon={<Activity className="h-5 w-5" />}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
        </div>
      ) : error ? (
        <p className="py-4 text-sm text-muted-foreground">{tr("teacher_dash_widget_load_error")}</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{tr("teacher_dash_activity_empty")}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            const content = (
              <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug text-foreground">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.subtitle}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground/80">
                    {formatActivityDate(item.timestamp, lang)}
                  </span>
                </span>
              </div>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link to={item.href} className="block transition-opacity hover:opacity-90">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </TeacherDashboardSection>
  );
}
