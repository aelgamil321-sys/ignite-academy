import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Clock3,
  Loader2,
  Megaphone,
} from "lucide-react";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import {
  fetchAdminTeacherDetail,
  type AdminTeacherActivityItem,
  type AdminTeacherDetail,
} from "@/lib/admin-teacher-directory";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n, L } from "@/lib/i18n";
import { useSchoolManagementPaths } from "@/lib/workspace-paths";
import { localeForFormatting } from "@/lib/i18n-config";
import {
  islamicGroupLabel,
  normalizeIslamicGroup,
  normalizeStudentSection,
  sectionLabel,
} from "@/lib/student-academics";
import type { TeacherAssignmentRow } from "@/lib/admin-teachers";
import { teachingSubjectLabel } from "@/lib/teacher-assignment-subject";

export const Route = createFileRoute("/admin/teachers/$teacherId")({
  head: () => ({
    meta: [
      { title: "Teacher Detail — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminTeacherDetailPage,
});

function formatDate(iso: string, lang: "en" | "ar"): string {
  if (!iso) return "—";
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

function formatAssignmentScope(row: TeacherAssignmentRow, lang: "en" | "ar"): string {
  const gradeLabel = gradeDisplayName(row.grade, lang);
  const sectionText = row.section
    ? sectionLabel(normalizeStudentSection(row.section), lang)
    : L("All sections", "كل الشعب")[lang];
  const groupText = row.islamic_group
    ? islamicGroupLabel(normalizeIslamicGroup(row.islamic_group), lang)
    : L("Both Islamic groups", "كلا المجموعتين الإسلامية")[lang];
  return `${subjectText} · ${gradeLabel} · ${sectionText} · ${groupText}`;
}

function activityIcon(item: AdminTeacherActivityItem) {
  if (item.kind === "assignment") return ClipboardList;
  if (item.kind === "announcement") return Megaphone;
  return CalendarDays;
}

function activityLabel(item: AdminTeacherActivityItem, tr: (key: string) => string): string {
  if (item.kind === "assignment") return tr("admin_teachers_activity_assignment");
  if (item.kind === "announcement") return tr("admin_teachers_activity_announcement");
  return tr("admin_teachers_activity_weekly_plan");
}

function activityKey(item: AdminTeacherActivityItem): string {
  return `${item.kind}-${item.id}-${item.at}`;
}

export function AdminTeacherDetailPage() {
  const { teacherId } = useParams({ strict: false });
  if (!teacherId) return null;
  const paths = useSchoolManagementPaths();
  const { tr, lang } = useI18n();
  const [detail, setDetail] = useState<AdminTeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAdminTeacherDetail(teacherId).then((result) => {
      if (!active) return;
      if (result.error) {
        setError(result.error);
        setDetail(null);
      } else if (!result.detail) {
        setError(tr("admin_teachers_not_found"));
        setDetail(null);
      } else {
        setDetail(result.detail);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [teacherId, tr]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
        {tr("admin_teachers_detail_loading")}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? tr("admin_teachers_not_found")}</p>
        <Link to={paths.teachers} className="text-sm font-medium text-primary hover:underline">
          {tr("admin_teachers_back")}
        </Link>
      </div>
    );
  }

  const { profile } = detail;
  const statusLabel =
    profile.accountStatus === "active"
      ? L("Active", "نشط")[lang]
      : L("No assignments", "بدون تكليفات")[lang];

  const statCards = [
    { label: tr("admin_teachers_col_assignments"), value: String(detail.assignmentsCreatedCount) },
    { label: tr("admin_teachers_col_announcements"), value: String(detail.announcementsCreatedCount) },
    {
      label: tr("admin_teachers_col_weekly_plans"),
      value: `${detail.weeklyPlansCount} (${detail.weeklyPlansByStatus.complete} ${tr("admin_teachers_complete")})`,
    },
    { label: tr("admin_teachers_col_lessons"), value: "—" },
  ];

  return (
    <div className="space-y-6">
      <Link
        to={paths.teachers}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        {tr("admin_teachers_back")}
      </Link>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col sm:flex-row gap-5">
          <StudentProfileAvatar
            profilePhotoPath={profile.profilePhotoPath}
            alt={profile.fullName}
            className="h-20 w-20 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="font-display text-2xl text-foreground">{profile.fullName}</h2>
              <p className="text-sm text-muted-foreground">{profile.email || "—"}</p>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{tr("admin_teachers_col_id")}</dt>
                <dd className="font-mono text-xs break-all">{profile.userId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{tr("admin_teachers_col_role")}</dt>
                <dd className="capitalize">
                  {profile.accountRole}
                  {profile.isLeadTeacher ? ` · ${tr("admin_teachers_lead_teacher")}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{tr("admin_teachers_col_status")}</dt>
                <dd>{statusLabel}</dd>
              </div>
              {profile.createdAt ? (
                <div>
                  <dt className="text-muted-foreground">{tr("admin_teachers_joined")}</dt>
                  <dd>{formatDate(profile.createdAt, lang)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4">
        <h3 className="font-display text-xl text-foreground">{tr("admin_teachers_teaching_scope")}</h3>
        {detail.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("admin_teachers_no_assignments")}</p>
        ) : (
          <ul className="space-y-2">
            {detail.assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              >
                {formatAssignmentScope(assignment, lang)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4">
        <h3 className="font-display text-xl text-foreground">{tr("admin_teachers_activity_title")}</h3>
        <p className="text-xs text-muted-foreground">{tr("admin_teachers_activity_note")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">{card.label}</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{card.value}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3 text-sm pt-2">
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground">{tr("admin_teachers_wp_not_started")}: </span>
            <span className="font-medium">{detail.weeklyPlansByStatus.not_started}</span>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground">{tr("admin_teachers_wp_in_progress")}: </span>
            <span className="font-medium">{detail.weeklyPlansByStatus.in_progress}</span>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-muted-foreground">{tr("admin_teachers_wp_complete")}: </span>
            <span className="font-medium">{detail.weeklyPlansByStatus.complete}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl text-foreground">{tr("admin_teachers_recent_activity")}</h3>
        </div>
        {detail.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("admin_teachers_no_activity")}</p>
        ) : (
          <ul className="space-y-3">
            {detail.recentActivity.map((item) => {
              const Icon = activityIcon(item);
              return (
                <li
                  key={activityKey(item)}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {activityLabel(item, tr)}
                      {item.kind === "weekly_plan" ? ` · ${item.status.replace("_", " ")}` : ""}
                    </div>
                    <div className="text-sm text-foreground truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatDate(item.at, lang)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
