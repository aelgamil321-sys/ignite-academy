import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminAnalyticsSnapshot } from "@/lib/admin-analytics";
import {
  fetchTeacherAnalytics,
  teacherCanUseAnalyticsFilter,
  type TeacherAnalyticsScope,
} from "@/lib/teacher-analytics";
import { TeacherAnalyticsPreview } from "@/components/teacher-analytics-preview";
import { TeacherAnnouncementsPanel } from "@/components/teacher-announcements-panel";
import { TeacherClassCards } from "@/components/teacher-class-cards";
import { TeacherDashboardHero } from "@/components/teacher-dashboard-hero";
import { TeacherDashboardKpis } from "@/components/teacher-dashboard-kpis";
import { TeacherNeedsAttention } from "@/components/teacher-needs-attention";
import { TeacherQuickActions } from "@/components/teacher-quick-actions";
import { TeacherRecentActivity } from "@/components/teacher-recent-activity";
import { TeacherTimetableWidget } from "@/components/teacher-timetable-ui";
import { TeacherScopeNotice } from "@/components/teacher-scope-notice";
import { TeacherStudentOverview } from "@/components/teacher-student-overview";
import { useI18n } from "@/lib/i18n";
import {
  fetchScopedStudents,
  fetchTeacherContext,
  fetchTeacherOverviewStats,
  type ScopedStudentRow,
  type TeacherContext,
  type TeacherOverviewStats,
} from "@/lib/teacher-dashboard";

export const Route = createFileRoute("/teacher/")({
  component: TeacherOverviewPage,
});

const EMPTY_ANALYTICS_FILTERS = { grade: "", section: "", islamicGroup: "" } as const;

function TeacherOverviewPage() {
  const { tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [stats, setStats] = useState<TeacherOverviewStats | null>(null);
  const [students, setStudents] = useState<ScopedStudentRow[]>([]);
  const [contextError, setContextError] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<AdminAnalyticsSnapshot | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);

  const analyticsScope: TeacherAnalyticsScope | null = useMemo(
    () =>
      context
        ? { isLeadTeacher: context.isLeadTeacher, assignments: context.assignments }
        : null,
    [context],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setContextError(false);
      setStatsError(false);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;

        const ctx = await fetchTeacherContext(auth.user.id);
        if (!active) return;
        setContext(ctx);

        try {
          const scopedStudents = await fetchScopedStudents();
          const overview = await fetchTeacherOverviewStats(ctx, scopedStudents);
          if (!active) return;
          setStudents(scopedStudents);
          setStats(overview);
        } catch {
          if (active) setStatsError(true);
        }
      } catch {
        if (active) setContextError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!analyticsScope) return;
    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError(false);

    if (!teacherCanUseAnalyticsFilter(analyticsScope, EMPTY_ANALYTICS_FILTERS)) {
      setAnalyticsSnapshot(null);
      setAnalyticsLoading(false);
      return () => {
        active = false;
      };
    }

    void fetchTeacherAnalytics(analyticsScope, EMPTY_ANALYTICS_FILTERS)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAnalyticsError(true);
          setAnalyticsSnapshot(null);
        } else {
          setAnalyticsSnapshot(data);
        }
      })
      .catch(() => {
        if (active) setAnalyticsError(true);
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [analyticsScope]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (contextError || !context) {
    return <p className="text-sm text-muted-foreground">{tr("teacher_load_error")}</p>;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-5 md:space-y-6">
      <TeacherDashboardHero context={context} />

      {statsError || !stats ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          {tr("teacher_dash_kpi_load_error")}
        </div>
      ) : (
        <TeacherDashboardKpis stats={stats} />
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-3">
          <TeacherNeedsAttention context={context} students={students} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <TeacherAnnouncementsPanel teacherUserId={context.userId} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <TeacherQuickActions variant="navy" />
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <TeacherAnalyticsPreview
          snapshot={analyticsSnapshot}
          scope={analyticsScope}
          loading={analyticsLoading}
          error={analyticsError}
        />
        <TeacherRecentActivity context={context} students={students} />
        <TeacherTimetableWidget />
      </div>

      <TeacherStudentOverview
        snapshot={analyticsSnapshot}
        students={students}
        loading={analyticsLoading}
        error={analyticsError}
      />

      <TeacherClassCards context={context} students={students} />

      <TeacherScopeNotice />
    </div>
  );
}
