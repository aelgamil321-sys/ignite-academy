import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft, Clock, Target, BookOpen, Sparkles, ClipboardList,
  FileText, Video, HelpCircle, Download, CheckCircle2, XCircle, RotateCcw,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useI18n, type TKey } from "@/lib/i18n";
import { getGrade, type Lesson } from "@/lib/curriculum";
import { useResolveLesson, ytId, type CustomFile, type CustomLesson, useCMS } from "@/lib/cms";
import { studentDownloadItems, fileNameFromUrl } from "@/lib/lesson-bilingual-files";
import videoPlaceholder from "@/assets/video-placeholder.jpg";

export const Route = createFileRoute("/grades/$grade/$lesson")({
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { gradeSlug: params.grade, lessonSlug: params.lesson };
  },
  head: () => ({ meta: [{ title: "Lesson — Ignite Islamic Academy" }] }),
  component: LessonPage,
  notFoundComponent: () => <div className="container-page py-20">Lesson not found.</div>,
  errorComponent: ({ error }) => <div className="container-page py-20">Error: {error.message}</div>,
});

function LessonPage() {
  const { gradeSlug, lessonSlug } = Route.useLoaderData();
  const { loading: cmsLoading } = useCMS();
  const resolved = useResolveLesson(gradeSlug, lessonSlug);
  const { tr, lang, dir } = useI18n();

  if (cmsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container-page py-20 text-muted-foreground">Loading lesson…</main>
        <SiteFooter />
      </div>
    );
  }

  if (!resolved?.grade) {
    return <div className="container-page py-20">Grade not found.</div>;
  }
  const { grade, lesson, custom, lessonFiles } = resolved;
  if (!lesson) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container-page py-20">
          <Link to="/grades/$grade" params={{ grade: grade.slug }} className="text-primary hover:text-emerald inline-flex items-center gap-2">
            <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            {tr("back_to_grade")} · {grade.name[lang]}
          </Link>
          <p className="mt-6 text-muted-foreground">Lesson not found.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const worksheetBody = (lesson.worksheet[lang] ?? "").trim()
    || (custom?.worksheetName
      ? (lang === "ar" ? `ورقة عمل مرفقة: ${custom.worksheetName}` : `Worksheet attached: ${custom.worksheetName}`)
      : "");

  const sections: Array<{ icon: typeof Target; key: TKey; body: string }> = [
    { icon: Target, key: "ls_outcome", body: lesson.outcome[lang] },
    { icon: BookOpen, key: "ls_content", body: lesson.explanation[lang] },
    { icon: Sparkles, key: "ls_activity", body: lesson.activity[lang] },
    { icon: ClipboardList, key: "ls_worksheet", body: worksheetBody },
  ];

  const ytUrl = custom?.youtubeUrl ? ytId(custom.youtubeUrl) : "";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-cream to-background border-b border-border">
          <div className="container-page py-10">
            <div className="mb-5"><Breadcrumbs items={[
              { label: tr("nav_stages"), to: "/grades" },
              { label: grade.name[lang], to: "/grades/$grade", params: { grade: grade.slug } },
              { label: lesson.title[lang] },
            ]} /></div>
            <Link to="/grades/$grade" params={{ grade: grade.slug }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5">
              <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              {tr("back_to_grade")} · {grade.name[lang]}
            </Link>
            <div className="text-xs uppercase tracking-[0.22em] text-emerald mb-2">
              {lesson.subject[lang]} · {lesson.unit[lang]}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-primary leading-tight">{lesson.title[lang]}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {lesson.duration} {tr("minutes")}</span>
              <span className="inline-flex items-center gap-1.5"><HelpCircle className="h-4 w-4" /> {lesson.quiz.length} Q</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {grade.name[lang]}</span>
            </div>
          </div>
        </section>

        <section className="container-page py-12 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {sections.map((s) => {
              const Icon = s.icon;
              const fallback = lang === "ar" ? "لم تتم إضافة هذا المحتوى بعد" : "This content has not been added yet";
              const body = (s.body ?? "").trim();
              return (
                <div key={s.key} className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-xl font-semibold text-primary">{tr(s.key)}</h2>
                  </div>
                  {body ? (
                    <p className="text-foreground/85 leading-relaxed whitespace-pre-line">{body}</p>
                  ) : (
                    <p className="text-muted-foreground italic">{fallback}</p>
                  )}
                </div>
              );
            })}

            {lesson.vocab.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-primary">{tr("vocab")}</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {lesson.vocab.map((vw, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background p-4">
                      <div className="font-display text-lg text-primary">{vw.term[lang]}</div>
                      {vw.def[lang] && <div className="text-sm text-muted-foreground mt-1">{vw.def[lang]}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <h2 className="font-display text-xl font-semibold text-primary">{tr("ls_video")}</h2>
              </div>
              {ytUrl ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden">
                  <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${ytUrl}`} title={lesson.title[lang]} allowFullScreen />
                </div>
              ) : (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden">
                  <img src={videoPlaceholder} alt="" loading="lazy" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-primary/70 grid place-content-center text-primary-foreground">
                    <div className="text-center px-6">
                      <Video className="h-10 w-10 mx-auto opacity-90" />
                      <div className="mt-3 font-display text-lg">{lang === "ar" ? "لم يتم رفع فيديو بعد" : "No video uploaded yet"}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <LessonDownloads custom={custom} />

            <Quiz lesson={lesson} />
          </div>

          <aside className="space-y-6">
            {lessonFiles.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sticky top-24">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{tr("ls_resources")}</div>
                <div className="space-y-2">
                  {lessonFiles.map((f: CustomFile) => (
                    <a key={f.id} href={f.fileUrl} download={f.fileName}
                      className="block rounded-lg border border-border bg-background px-3 py-2 text-xs hover:border-emerald hover:text-emerald">
                      {f.title[lang]} <span className="opacity-60">· {f.type.toUpperCase()}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}

function LessonDownloads({ custom }: { custom?: CustomLesson }) {
  const items = custom ? studentDownloadItems(custom) : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
          <Download className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-primary">
          Downloads / الملفات
        </h2>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {items.map((item) => (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              download={fileNameFromUrl(item.url)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:border-emerald hover:text-emerald transition-colors"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">
          لا توجد ملفات مرفقة لهذا الدرس
          <br />
          No files attached to this lesson
        </p>
      )}
    </div>
  );
}

function Quiz({ lesson }: { lesson: Lesson }) {
  const { tr, lang } = useI18n();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  if (lesson.quiz.length === 0) return null;
  const score = lesson.quiz.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
          <HelpCircle className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-primary">{tr("ls_quiz")}</h2>
      </div>
      <div className="space-y-6">
        {lesson.quiz.map((q, i) => {
          const selected = answers[i];
          const isCorrect = submitted && selected === q.answer;
          return (
            <div key={i} className="rounded-xl border border-border bg-background p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald mb-2">{tr("question")} {i + 1}</div>
              <div className="font-medium text-foreground mb-3">{q.q[lang]}</div>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  const chosen = selected === oi;
                  const correctChoice = submitted && oi === q.answer;
                  const wrongChoice = submitted && chosen && oi !== q.answer;
                  return (
                    <button key={oi} disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                      className={[
                        "text-start rounded-lg border px-4 py-2.5 text-sm transition-colors",
                        correctChoice ? "border-emerald bg-emerald/10 text-emerald"
                          : wrongChoice ? "border-destructive bg-destructive/10 text-destructive"
                          : chosen ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-emerald hover:text-emerald",
                      ].join(" ")}
                    >{opt[lang]}</button>
                  );
                })}
              </div>
              {submitted && (
                <div className={`mt-3 inline-flex items-center gap-2 text-sm font-medium ${isCorrect ? "text-emerald" : "text-destructive"}`}>
                  {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {isCorrect ? tr("correct") : tr("incorrect")}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {!submitted ? (
          <button onClick={() => setSubmitted(true)}
            disabled={Object.keys(answers).length !== lesson.quiz.length}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)] disabled:opacity-50 disabled:cursor-not-allowed">
            {tr("submit_quiz")}
          </button>
        ) : (
          <>
            <div className="font-display text-lg text-primary">
              {tr("your_score")}: <span className="text-emerald">{score}/{lesson.quiz.length}</span>
            </div>
            <button onClick={() => { setAnswers({}); setSubmitted(false); }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold hover:border-emerald hover:text-emerald transition-colors">
              <RotateCcw className="h-4 w-4" /> {tr("retry_quiz")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
