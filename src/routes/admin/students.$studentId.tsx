import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  Loader2,
  Users,
} from "lucide-react";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { StudentBadgesSection } from "@/components/student-badges-section";
import { fetchAdminStudentDetail, type AdminStudentDetail } from "@/lib/admin-students";
import type { ActivityTimelineItem } from "@/lib/student-progress";
import { useI18n, L } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";
import {
  islamicGroupLabel,
  sectionLabel,
} from "@/lib/student-academics";

export const Route = createFileRoute("/admin/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student Detail — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminStudentDetailPage,
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

function timelineKey(item: ActivityTimelineItem): string {
  if (item.kind === "badge_unlocked") return `badge-${item.badgeId}-${item.at}`;
  if (item.kind === "certificate_earned") return `cert-${item.certificateId}`;
  return `quiz-${item.submissionId}`;
}

function AdminStudentDetailPage() {
  const { studentId } = Route.useParams();
  const { tr, lang, bi, dir } = useI18n();
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAdminStudentDetail(studentId).then((result) => {
      if (!active) return;
      if (result.error || !result.data) {
        setError(result.error ?? tr("admin_students_not_found"));
        setDetail(null);
      } else {
        setDetail(result.data);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [studentId, tr]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
        {tr("admin_students_detail_loading")}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? tr("admin_students_not_found")}</p>
        <Link to="/admin/students" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {tr("admin_students_back")}
        </Link>
      </div>
    );
  }

  const { profile, progress, parentLinks } = detail;
  const gradeLabel = lang === "ar" ? profile.gradeLabelAr : profile.gradeLabelEn;

  return (
    <div className="space-y-6">
      <Link to="/admin/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        {tr("admin_students_back")}
      </Link>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <StudentProfileAvatar
            profilePhotoPath={profile.profilePhotoPath}
            alt={profile.fullName}
            className="h-20 w-20 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="font-display text-2xl text-foreground">{profile.englishName}</h2>
              <p className="text-lg text-muted-foreground" dir="rtl">
                {profile.arabicName}
              </p>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{tr("admin_students_col_id")}</dt>
                <dd className="font-mono text-xs break-all">{profile.userId}</dd>
              </div>
              {profile.studentLinkCode ? (
                <div>
                  <dt className="text-muted-foreground">{L("Parent link code", "رمز ربط ولي الأمر")[lang]}</dt>
                  <dd className="font-mono">{profile.studentLinkCode}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">{L("Grade", "الصف")[lang]}</dt>
                <dd>{gradeLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{L("Section", "الشعبة")[lang]}</dt>
                <dd>{sectionLabel(profile.section, lang)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{L("Islamic Group", "المجموعة الإسلامية")[lang]}</dt>
                <dd>{islamicGroupLabel(profile.islamicGroup, lang)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{L("Account", "الحساب")[lang]}</dt>
                <dd className="capitalize">{profile.accountRole}</dd>
              </div>
              {profile.email ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">{L("Email", "البريد الإلكتروني")[lang]}</dt>
                  <dd className="break-all">{profile.email}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">{L("Registered", "تاريخ التسجيل")[lang]}</dt>
                <dd>{profile.createdAt ? formatDate(profile.createdAt, lang) : "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: tr("admin_students_col_progress"), value: `${progress.overallProgressPct}%` },
          {
            label: tr("admin_students_col_quiz_avg"),
            value: progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`,
          },
          {
            label: L("Lessons Completed", "الدروس المكتملة")[lang],
            value: `${progress.completedLessons} / ${progress.totalLessons}`,
          },
          { label: tr("admin_students_col_certificates"), value: String(progress.certificatesEarned) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</div>
            <div className="mt-2 font-display text-2xl text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      <StudentBadgesSection progress={progress} />

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl text-foreground">{L("Certificates", "الشهادات")[lang]}</h3>
        </div>
        {progress.certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("admin_students_no_certificates")}</p>
        ) : (
          <div className="space-y-2">
            {progress.certificates.map((cert) => (
              <div key={cert.certificateId} className="rounded-xl border border-border px-4 py-3 text-sm">
                <div className="font-medium">{bi(cert.lessonTitle)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {cert.certificateId} · {cert.percentage}% · {formatDate(cert.issuedAt, lang)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl text-foreground">{tr("admin_students_parent_links")}</h3>
        </div>
        {parentLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("admin_students_no_parents")}</p>
        ) : (
          <div className="space-y-2">
            {parentLinks.map((parent) => (
              <div key={parent.parentUserId} className="rounded-xl border border-border px-4 py-3 text-sm">
                <div className="font-medium">{parent.parentName}</div>
                <div className="text-xs text-muted-foreground">{parent.parentEmail}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl text-foreground">{tr("parent_recent_activity")}</h3>
        </div>
        {progress.activityTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("parent_activity_empty")}</p>
        ) : (
          <ul className="space-y-3">
            {progress.activityTimeline.slice(0, 8).map((item) => (
              <li key={timelineKey(item)} className="flex items-start gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                <ClipboardCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground">
                    {item.kind === "badge_unlocked"
                      ? item.badgeTitle.en
                      : bi(item.lessonTitle) || item.lessonTitle.en}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(item.at, lang)}
                    {item.kind !== "badge_unlocked" ? ` · ${item.scorePct}%` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
