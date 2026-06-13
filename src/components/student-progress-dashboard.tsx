import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpenCheck,
  ClipboardCheck,
  Medal,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StudentBadgesSection } from "@/components/student-badges-section";
import { useI18n } from "@/lib/i18n";
import type { StudentProgressData } from "@/lib/student-progress";

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

export function StudentProgressDashboard({
  progress,
  gradeName,
  gradeSlug,
}: {
  progress: StudentProgressData;
  gradeName: string;
  gradeSlug: string;
}) {
  const { lang } = useI18n();
  const learningLevel = lang === "ar" ? progress.learningLevelAr : progress.learningLevelEn;

  const statCards = [
    {
      key: "progress",
      icon: TrendingUp,
      label: L("Overall Progress", "التقدّم الإجمالي")[lang],
      value: `${progress.overallProgressPct}%`,
      sub: (
        <Progress value={progress.overallProgressPct} className="mt-3 h-2" />
      ),
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
      value:
        progress.averageQuizScorePct === null
          ? "—"
          : `${progress.averageQuizScorePct}%`,
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
                {card.key === "level" ? (
                  card.sub
                ) : (
                  card.value
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
              {card.key !== "level" && card.sub}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-emerald mb-1">
              {L("My Grade", "صفّي")[lang]}
            </div>
            <h2 className="font-display text-2xl text-primary">{gradeName}</h2>
          </div>
          <Link
            to="/grades/$grade"
            params={{ grade: gradeSlug }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors"
          >
            {L("Browse lessons", "تصفّح الدروس")[lang]}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {L(
            "Progress is based on lesson quizzes you have submitted for your grade.",
            "يُحسب التقدّم من اختبارات الدروس التي أرسلتها لصفّك.",
          )[lang]}
        </p>
      </div>

      <StudentBadgesSection progress={progress} />

      <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Award className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl text-primary">
            {L("Certificates", "الشهادات")[lang]}
          </h2>
        </div>
        {progress.certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {L(
              "No certificates yet. Complete a lesson quiz to earn one.",
              "لا توجد شهادات بعد. أكمل اختبار درس لتحصل على شهادة.",
            )[lang]}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-start">
                  <th className="py-2 pe-4 font-semibold">
                    {L("Certificate ID", "رقم الشهادة")[lang]}
                  </th>
                  <th className="py-2 pe-4 font-semibold">
                    {L("Lesson", "الدرس")[lang]}
                  </th>
                  <th className="py-2 pe-4 font-semibold">
                    {L("Score", "الدرجة")[lang]}
                  </th>
                  <th className="py-2 font-semibold">
                    {L("Issued", "تاريخ الإصدار")[lang]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {progress.certificates.map((c) => (
                  <tr key={c.certificateId} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pe-4 font-mono text-xs text-emerald">{c.certificateId}</td>
                    <td className="py-3 pe-4">
                      <Link
                        to="/grades/$grade/$lesson"
                        params={{ grade: gradeSlug, lesson: c.lessonId }}
                        className="font-medium text-primary hover:text-emerald"
                      >
                        {c.lessonTitle[lang] || c.lessonTitle.en}
                      </Link>
                    </td>
                    <td className="py-3 pe-4">{c.percentage}%</td>
                    <td className="py-3 text-muted-foreground">{formatDate(c.issuedAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
            <Trophy className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl text-primary">
            {L("Recent Achievements", "الإنجازات الأخيرة")[lang]}
          </h2>
        </div>
        {progress.recentAchievements.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {L(
              "Submit your first quiz to see achievements here.",
              "أرسل أول اختبار ليظهر إنجازك هنا.",
            )[lang]}
          </p>
        ) : (
          <ul className="space-y-3">
            {progress.recentAchievements.map((item) => (
              <li
                key={item.kind === "certificate" ? item.certificateId : item.submissionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald">
                    {item.kind === "certificate"
                      ? L("Certificate earned", "شهادة مكتسبة")[lang]
                      : L("Quiz submitted", "اختبار مُرسَل")[lang]}
                  </div>
                  <Link
                    to="/grades/$grade/$lesson"
                    params={{ grade: gradeSlug, lesson: item.lessonId }}
                    className="mt-0.5 block font-display text-lg text-primary hover:text-emerald truncate"
                  >
                    {item.lessonTitle[lang] || item.lessonTitle.en}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(item.at, lang)}
                    {item.kind === "certificate" && (
                      <span className="ms-2 font-mono">{item.certificateId}</span>
                    )}
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div className="font-display text-2xl text-primary">{item.scorePct}%</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
