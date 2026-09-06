import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  ClipboardCheck,
  Clock,
  FileText,
  FileSpreadsheet,
  PlayCircle,
  BookOpen,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useI18n, L } from "@/lib/i18n";
import { isRtlLang, contentLocale, type Lang } from "@/lib/i18n-config";
import { customToLesson, type CustomLesson } from "@/lib/cms";
import { getSubjectCategory } from "@/lib/categories";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import { fileNameFromUrl } from "@/lib/lesson-bilingual-files";
import { supabase } from "@/integrations/supabase/client";


type LessonStatus = "not_started" | "in_progress" | "pending_review" | "completed";

type SubmissionMeta = {
  status: "pending_review" | "reviewed";
  id: string;
};

const TOUCHED_KEY = (lessonId: string) => `ignite-lesson-touched:${lessonId}`;

function markLessonTouched(lessonId: string) {
  try {
    localStorage.setItem(TOUCHED_KEY(lessonId), "1");
  } catch {
    /* ignore */
  }
}

function isLessonTouched(lessonId: string): boolean {
  try {
    return localStorage.getItem(TOUCHED_KEY(lessonId)) === "1";
  } catch {
    return false;
  }
}

function pickPdfUrl(custom: CustomLesson, lang: Lang): string | null {
  const locale = contentLocale(lang);
  const ar = custom.pdfArUrl?.trim();
  const en = custom.pdfEnUrl?.trim();
  const legacy = custom.pdfUrl?.trim();
  if (locale === "ar") return ar || en || legacy || null;
  return en || ar || legacy || null;
}

function pickWorksheetUrl(custom: CustomLesson, lang: Lang): string | null {
  const locale = contentLocale(lang);
  const ar = custom.worksheetArUrl?.trim();
  const en = custom.worksheetEnUrl?.trim();
  const legacy = custom.worksheetUrl?.trim();
  if (locale === "ar") return ar || en || legacy || null;
  return en || ar || legacy || null;
}

function hasLessonVideo(custom: CustomLesson): boolean {
  return Boolean(
    custom.youtubeUrl?.trim() ||
      custom.youtubeArUrl?.trim() ||
      custom.youtubeEnUrl?.trim(),
  );
}

function resolveStatus(
  lessonId: string,
  submission: SubmissionMeta | undefined,
  hasQuiz: boolean,
): LessonStatus {
  if (submission?.status === "pending_review") return "pending_review";
  if (submission?.status === "reviewed") return "completed";
  if (hasQuiz && isLessonTouched(lessonId)) return "in_progress";
  return "not_started";
}

const STATUS_STYLES: Record<LessonStatus, string> = {
  not_started: "bg-muted/60 text-muted-foreground border-border",
  in_progress: "bg-primary/10 text-primary border-primary/35",
  pending_review: "bg-amber-500/10 text-amber-900 border-amber-400/40",
  completed: "bg-brand-dark/5 text-brand-dark border-primary/40",
};

function StatusBadge({ status, lang }: { status: LessonStatus; lang: "en" | "ar" }) {
  const labels: Record<LessonStatus, { en: string; ar: string }> = {
    not_started: L("Not Started", "لم يبدأ"),
    in_progress: L("In Progress", "قيد التقدّم"),
    pending_review: L("Pending Review", "قيد المراجعة"),
    completed: L("Completed", "مكتمل"),
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {labels[status][lang]}
    </span>
  );
}

function ActionButton({
  to,
  params,
  hash,
  href,
  onClick,
  icon: Icon,
  label,
  disabled,
  external,
}: {
  to?: "/grades/$grade/$lesson";
  params?: { grade: string; lesson: string };
  hash?: string;
  href?: string;
  onClick?: () => void;
  icon: typeof PlayCircle;
  label: string;
  disabled?: boolean;
  external?: boolean;
}) {
  const base =
    "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs sm:text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-45";

  if (disabled || (!to && !href)) {
    return (
      <span className={`${base} opacity-45`} aria-disabled>
        <Icon className="h-4 w-4 shrink-0 text-primary/80" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  if (external && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        download={fileNameFromUrl(href)}
        onClick={onClick}
        className={base}
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </a>
    );
  }

  if (to && params) {
    return (
      <Link to={to} params={params} hash={hash} onClick={onClick} className={base}>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return null;
}

export function GradeLessonsSection({
  gradeSlug,
  lessons,
  gradesBasePath = "/grades",
}: {
  gradeSlug: string;
  lessons: CustomLesson[];
  gradesBasePath?: "/grades" | "/admin/grades";
}) {
  const lessonRoute =
    gradesBasePath === "/admin/grades" ? "/admin/grades/$grade/$lesson" : "/grades/$grade/$lesson";
  const { lang, tr, trf, bi } = useI18n();
  const [submissions, setSubmissions] = useState<Record<string, SubmissionMeta>>({});
  const [touchVersion, setTouchVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!active) return;

      if (!userId || lessons.length === 0) {
        setSubmissions({});
        return;
      }

      const ids = lessons.map((l) => l.id);
      const { data } = await supabase
        .from("lesson_quiz_submissions")
        .select("lesson_id, status, id, submitted_at")
        .eq("student_id", userId)
        .in("lesson_id", ids)
        .order("submitted_at", { ascending: false });

      if (!active) return;

      const map: Record<string, SubmissionMeta> = {};
      for (const row of data ?? []) {
        const lessonId = String(row.lesson_id);
        if (!map[lessonId]) {
          map[lessonId] = {
            id: String(row.id),
            status: row.status === "pending_review" ? "pending_review" : "reviewed",
          };
        }
      }
      setSubmissions(map);
    })();

    return () => {
      active = false;
    };
  }, [lessons]);

  const progress = useMemo(() => {
    const total = lessons.length;
    const completed = lessons.filter((l) => submissions[l.id]?.status === "reviewed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [lessons, submissions]);

  const touchLesson = (lessonId: string) => {
    markLessonTouched(lessonId);
    setTouchVersion((v) => v + 1);
  };

  void touchVersion;

  return (
    <div className="space-y-6">
      {lessons.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary mb-1">
                {L("Your Progress", "تقدّمك")[lang]}
              </div>
              <p className="text-sm text-muted-foreground">
                {L("Completed lessons", "الدروس المكتملة")[lang]}
              </p>
            </div>
            <div className="font-display text-2xl text-foreground tabular-nums">
              {progress.completed}
              <span className="text-muted-foreground text-lg font-sans"> / {progress.total}</span>
            </div>
          </div>
          <Progress value={progress.pct} className="h-2.5" />
          <p className="mt-2 text-xs text-muted-foreground">
            {trf("progress_lessons_pct", { pct: String(progress.pct) })}
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        {lessons.map((custom, index) => {
          const lesson = customToLesson(custom, lang);
          const pdfUrl = pickPdfUrl(custom, lang);
          const worksheetUrl = pickWorksheetUrl(custom, lang);
          const videoAvailable = hasLessonVideo(custom);
          const quizQuestions = normalizeQuizList(custom.quiz ?? []);
          const hasQuiz = quizQuestions.length > 0;
          const submission = submissions[custom.id];
          const status = resolveStatus(custom.id, submission, hasQuiz);
          const subjectCat = getSubjectCategory(custom.subjectCategory);
          const subject = subjectCat ? bi(subjectCat.name) : custom.subjectCategory;

          const quizLabel =
            status === "in_progress"
              ? L("Continue Quiz", "متابعة الاختبار")[lang]
              : L("Start Quiz", "بدء الاختبار")[lang];

          return (
            <article
              key={custom.id}
              className="w-full rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden transition-shadow hover:shadow-[var(--shadow-elegant)]"
            >
              <div className="border-b border-border/80 bg-gradient-to-r from-brand-dark/[0.03] to-primary/[0.06] px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-primary mb-1.5">
                      {tr("lesson")} {index + 1} · {subject}
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-snug break-words">
                      {bi(lesson.title, {
                        lessonId: custom.id,
                        fieldName: "title",
                        contentType: "title",
                      })}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground break-words">
                      {bi(lesson.unit, {
                        lessonId: custom.id,
                        fieldName: "unit",
                        contentType: "general",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={status} lang={lang} />
                </div>
                {lesson.duration > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {lesson.duration} {tr("minutes")}
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {L("Lesson Actions", "إجراءات الدرس")[lang]}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <ActionButton
                    to={lessonRoute}
                    params={{ grade: gradeSlug, lesson: custom.id }}
                    hash="lesson-video"
                    onClick={() => touchLesson(custom.id)}
                    icon={PlayCircle}
                    label={L("Watch Lesson Video", "مشاهدة فيديو الدرس")[lang]}
                    disabled={!videoAvailable}
                  />
                  <ActionButton
                    href={pdfUrl ?? undefined}
                    onClick={() => touchLesson(custom.id)}
                    icon={FileText}
                    label={L("Download PDF", "تحميل PDF")[lang]}
                    disabled={!pdfUrl}
                    external
                  />
                  <ActionButton
                    href={worksheetUrl ?? undefined}
                    onClick={() => {
                      touchLesson(custom.id);
                    }}
                    icon={FileSpreadsheet}
                    label={L("Download Worksheet", "تحميل ورقة العمل")[lang]}
                    disabled={!worksheetUrl}
                    external
                  />
                  <ActionButton
                    to={lessonRoute}
                    params={{ grade: gradeSlug, lesson: custom.id }}
                    hash="lesson-quiz"
                    onClick={() => touchLesson(custom.id)}
                    icon={ClipboardCheck}
                    label={quizLabel}
                    disabled={!hasQuiz}
                  />
                  <ActionButton
                    to={lessonRoute}
                    params={{ grade: gradeSlug, lesson: custom.id }}
                    hash="lesson-result"
                    onClick={() => touchLesson(custom.id)}
                    icon={submission ? Award : BookOpen}
                    label={L("View Result", "عرض النتيجة")[lang]}
                    disabled={!submission}
                  />
                </div>
                {pdfUrl && (
                  <p className="sr-only">{fileNameFromUrl(pdfUrl)}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
