import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpenCheck,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Medal,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { computeStudentBadges } from "@/lib/student-badges";
import { useI18n } from "@/lib/i18n";
import type { ParentDashboardData } from "@/lib/parent-dashboard";
import type { ActivityTimelineItem } from "@/lib/student-progress";

const L = (en: string, ar: string) => ({ en, ar });

function formatDate(iso: string, lang: "en" | "ar"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function learningLevelClass(label: string): string {
  if (label === "Excellent" || label === "ممتاز") return "bg-emerald/15 text-emerald border-emerald/30";
  if (label === "Very Good" || label === "جيد جدًا") return "bg-primary/10 text-primary border-primary/25";
  if (label === "Good" || label === "جيد") return "bg-sky-500/10 text-sky-700 border-sky-500/25";
  if (label === "Pass" || label === "مقبول") return "bg-amber-500/10 text-amber-800 border-amber-500/25";
  if (label === "Not started" || label === "لم يبدأ بعد") return "bg-muted text-muted-foreground border-border";
  return "bg-destructive/10 text-destructive border-destructive/25";
}

function timelineKey(item: ActivityTimelineItem): string {
  if (item.kind === "quiz_completed") return `quiz-${item.submissionId}`;
  if (item.kind === "certificate_earned") return `cert-${item.certificateId}`;
  return `badge-${item.badgeId}-${item.at}`;
}

export function ParentDashboardView({
  data,
  gradeName,
}: {
  data: ParentDashboardData;
  gradeName: string;
}) {
  const { lang } = useI18n();
  const { progress, studentName } = data;
  const learningLevel = lang === "ar" ? progress.learningLevelAr : progress.learningLevelEn;
  const { badges } = computeStudentBadges(progress);
  const unlockedBadges = badges.filter((badge) => badge.unlocked);
  const latestCertificates = progress.certificates.slice(0, 5);
  const latestBadges = progress.activityTimeline
    .filter((item) => item.kind === "badge_unlocked")
    .slice(0, 6);

  const statCards = [
    {
      key: "progress",
      icon: TrendingUp,
      label: L("Overall Progress", "التقدّم الإجمالي")[lang],
      value: `${progress.overallProgressPct}%`,
      sub: <Progress value={progress.overallProgressPct} className="mt-3 h-2" />,
    },
    {
      key: "lessons",
      icon: BookOpenCheck,
      label: L("Lessons Completed", "الدروس المكتملة")[lang],
      value: `${progress.completedLessons} / ${progress.totalLessons}`,
      sub: null,
    },
    {
      key: "certificates",
      icon: Award,
      label: L("Certificates Earned", "الشهادات المكتسبة")[lang],
      value: String(progress.certificatesEarned),
      sub: null,
    },
    {
      key: "average",
      icon: ClipboardCheck,
      label: L("Average Quiz Score", "متوسط درجات الاختبارات")[lang],
      value: progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`,
      sub: null,
    },
    {
      key: "level",
      icon: Medal,
      label: L("Learning Level", "المستوى التعليمي")[lang],
      value: learningLevel,
      sub: (
        <span
          className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${learningLevelClass(learningLevel)}`}
        >
          {learningLevel}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-emerald mb-1">
                {L("Student Name", "اسم الطالب")[lang]}
              </div>
              <h2 className="font-display text-2xl md:text-3xl text-primary leading-tight">
                {studentName[lang] || studentName.en}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
                  <GraduationCap className="h-4 w-4 text-emerald" />
                  <span className="font-semibold text-primary">{gradeName}</span>
                </span>
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${learningLevelClass(learningLevel)}`}
                >
                  {learningLevel}
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/grades/$grade"
            params={{ grade: data.gradeSlug }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors"
          >
            {L("View grade lessons", "عرض دروس الصف")[lang]}
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-display text-2xl md:text-3xl text-primary leading-tight">
                {card.key === "level" ? card.sub : card.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
              {card.key !== "level" && card.sub}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Award className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl text-primary">
              {L("Latest Certificates", "أحدث الشهادات")[lang]}
            </h2>
          </div>
          {latestCertificates.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {L(
                "No certificates yet. Completed lesson quizzes will appear here.",
                "لا توجد شهادات بعد. ستظهر هنا عند إتمام اختبارات الدروس.",
              )[lang]}
            </p>
          ) : (
            <ul className="space-y-3">
              {latestCertificates.map((certificate) => (
                <li
                  key={certificate.certificateId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/grades/$grade/$lesson"
                      params={{ grade: data.gradeSlug, lesson: certificate.lessonId }}
                      className="font-display text-lg text-primary hover:text-emerald truncate block"
                    >
                      {certificate.lessonTitle[lang] || certificate.lessonTitle.en}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(certificate.issuedAt, lang)}
                      <span className="ms-2 font-mono text-emerald">{certificate.certificateId}</span>
                    </div>
                  </div>
                  <div className="font-display text-2xl text-primary shrink-0">
                    {certificate.percentage}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl text-primary">
              {L("Latest Badges", "أحدث الشارات")[lang]}
            </h2>
          </div>
          {unlockedBadges.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {L(
                "No badges unlocked yet. Progress milestones will appear here.",
                "لم تُفتح شارات بعد. ستظهر هنا عند تحقيق إنجازات التقدّم.",
              )[lang]}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(latestBadges.length > 0
                ? latestBadges.map((item) => ({
                    id: item.badgeId,
                    icon: item.badgeIcon,
                    title: item.badgeTitle,
                    at: item.at,
                  }))
                : unlockedBadges.map((badge) => ({
                    id: badge.id,
                    icon: badge.icon,
                    title: badge.title,
                    at: "",
                  }))
              ).map((badge) => (
                <article
                  key={badge.id}
                  className="rounded-xl border border-emerald/25 bg-gradient-to-br from-emerald/5 to-background p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-2xl shadow-sm">
                      {badge.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base text-primary leading-snug">
                        {badge.title[lang]}
                      </h3>
                      {badge.at ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(badge.at, lang)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl text-primary">
              {L("Recent Activity", "النشاط الأخير")[lang]}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {L(
                "Quiz completions, certificates, and badge milestones.",
                "إتمام الاختبارات والشهادات وإنجازات الشارات.",
              )[lang]}
            </p>
          </div>
        </div>
        {progress.activityTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {L(
              "Activity will appear here once quizzes are submitted.",
              "سيظهر النشاط هنا بعد إرسال الاختبارات.",
            )[lang]}
          </p>
        ) : (
          <ul className="space-y-0">
            {progress.activityTimeline.map((item, index) => (
              <li key={timelineKey(item)} className="relative flex gap-4 pb-6 last:pb-0">
                {index < progress.activityTimeline.length - 1 && (
                  <span
                    className="absolute start-[1.125rem] top-10 bottom-0 w-px bg-border"
                    aria-hidden
                  />
                )}
                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                    item.kind === "badge_unlocked"
                      ? "border-emerald/30 bg-emerald/10 text-lg"
                      : item.kind === "certificate_earned"
                        ? "border-gold/30 bg-gold/10 text-gold"
                        : "border-primary/20 bg-primary/10 text-primary"
                  }`}
                >
                  {item.kind === "badge_unlocked" ? (
                    <span aria-hidden>{item.badgeIcon}</span>
                  ) : item.kind === "certificate_earned" ? (
                    <Award className="h-4 w-4" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald">
                    {item.kind === "badge_unlocked"
                      ? L("Badge unlocked", "شارة مفتوحة")[lang]
                      : item.kind === "certificate_earned"
                        ? L("Certificate earned", "شهادة مكتسبة")[lang]
                        : L("Quiz completed", "اختبار مكتمل")[lang]}
                  </div>
                  <div className="mt-1 font-display text-lg text-primary leading-snug">
                    {item.kind === "badge_unlocked"
                      ? item.badgeTitle[lang]
                      : item.lessonTitle[lang] || item.lessonTitle.en}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(item.at, lang)}</span>
                    {item.kind !== "badge_unlocked" && (
                      <span className="rounded-full bg-emerald/10 px-2 py-0.5 font-semibold text-emerald">
                        {item.scorePct}%
                      </span>
                    )}
                    {item.kind === "certificate_earned" && (
                      <span className="font-mono">{item.certificateId}</span>
                    )}
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
