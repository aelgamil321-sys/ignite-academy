import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import {
  ChevronLeft, Clock, Target, BookOpen, Sparkles, ClipboardList,
  FileText, Video, HelpCircle, Download,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useI18n, type TKey, prefetchEducationalTranslations, useLessonTranslationScope } from "@/lib/i18n";
import { needsDynamicTranslation } from "@/lib/translate-content";
import type { EducationalField } from "@/lib/translate-content";
import type { Bi } from "@/lib/curriculum";
import { getGrade } from "@/lib/curriculum";
import { useResolveLesson, lessonVideoEmbeds, type CustomFile, type CustomLesson, useCMS } from "@/lib/cms";
import { studentDownloadItems, fileNameFromUrl, type StudentDownloadItem } from "@/lib/lesson-bilingual-files";
import { LessonQuizStudent } from "@/components/lesson-quiz-student";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import { useLessonHashScroll } from "@/lib/lesson-hash-scroll";
import { TranslatedContentShell } from "@/components/translation-loading-indicator";
import videoPlaceholder from "@/assets/video-placeholder.jpg";

export const Route = createFileRoute("/grades/$grade/$lesson")({
  beforeLoad: () => blockParentFromStudentRoutes(),
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
  const { tr, lang, dir, bi } = useI18n();
  const lessonReady = !cmsLoading && Boolean(resolved?.lesson);
  useLessonTranslationScope(lessonSlug);

  useEffect(() => {
    if (!resolved?.lesson || !needsDynamicTranslation(lang)) return;
    const lesson = resolved.lesson;
    const source = (b: Bi) => b.en?.trim() || b.ar?.trim() || "";
    const fields: EducationalField[] = [
      { fieldName: "title", contentType: "title", text: source(lesson.title) },
      { fieldName: "outcome", contentType: "outcome", text: source(lesson.outcome) },
      { fieldName: "explanation", contentType: "content", text: source(lesson.explanation) },
      { fieldName: "activity", contentType: "activity", text: source(lesson.activity) },
      { fieldName: "worksheet", contentType: "worksheet", text: source(lesson.worksheet) },
      { fieldName: "grade", contentType: "general", text: source(resolved.grade.name) },
      { fieldName: "subject", contentType: "general", text: source(lesson.subject) },
      { fieldName: "unit", contentType: "general", text: source(lesson.unit) },
      ...lesson.vocab.flatMap((v, i) => [
        { fieldName: `vocab_term_${i}`, contentType: "vocab_term" as const, text: source(v.term) },
        { fieldName: `vocab_def_${i}`, contentType: "vocab_def" as const, text: source(v.def) },
      ]),
      ...normalizeQuizList(resolved.custom?.quiz ?? lesson.quiz).flatMap((q, qi) => [
        { fieldName: `quiz_q_${qi}`, contentType: "quiz_question" as const, text: source(q.q) },
        ...q.options.map((o, oi) => ({
          fieldName: `quiz_q_${qi}_opt_${oi}`,
          contentType: "quiz_option" as const,
          text: source(o),
        })),
      ]),
    ].filter((f) => f.text);
    prefetchEducationalTranslations(lessonSlug, fields, lang);
  }, [resolved, lang, lessonSlug]);

  useLessonHashScroll(lessonReady, lessonSlug);

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
          <Link to="/grades/$grade" params={{ grade: grade.slug }} className="text-primary hover:text-primary inline-flex items-center gap-2">
            <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            {tr("back_to_grade")} · {bi(grade.name)}
          </Link>
          <p className="mt-6 text-muted-foreground">Lesson not found.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const worksheetBody = (bi(lesson.worksheet, { fieldName: "worksheet", contentType: "worksheet" }) ?? "").trim()
    || (custom?.worksheetName
      ? (lang === "ar" ? `ورقة عمل مرفقة: ${custom.worksheetName}` : `Worksheet attached: ${custom.worksheetName}`)
      : "");

  const sections: Array<{ icon: typeof Target; key: TKey; body: string }> = [
    { icon: Target, key: "ls_outcome", body: bi(lesson.outcome, { fieldName: "outcome", contentType: "outcome" }) },
    { icon: BookOpen, key: "ls_content", body: bi(lesson.explanation, { fieldName: "explanation", contentType: "content" }) },
    { icon: Sparkles, key: "ls_activity", body: bi(lesson.activity, { fieldName: "activity", contentType: "activity" }) },
    { icon: ClipboardList, key: "ls_worksheet", body: worksheetBody },
  ];

  const lessonVideos = lessonVideoEmbeds(custom, lang);
  const quizCount = normalizeQuizList(custom?.quiz ?? lesson.quiz).length;
  const hasQuiz = Boolean(custom && quizCount > 0);

  const lessonCard =
    "w-full max-w-full overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] md:rounded-2xl md:p-7";
  const lessonCardHeader = "flex items-center gap-2.5 mb-2.5 md:gap-3 md:mb-3";
  const lessonCardIcon =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:h-10 md:w-10";
  const lessonCardTitle = "min-w-0 font-display text-lg font-semibold text-foreground md:text-xl";
  const lessonBody = "text-sm leading-[1.8] text-foreground/85 whitespace-pre-line [overflow-wrap:anywhere] md:text-base";
  const resourceBtn =
    "flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 overflow-x-hidden">
        <section className="bg-gradient-to-b from-cream to-background border-b border-border">
          <div className="container-page pt-3 pb-4 md:py-10">
            <div className="hidden md:block mb-5">
              <Breadcrumbs items={[
                { label: tr("nav_stages"), to: "/grades" },
                { label: bi(grade.name, { fieldName: "grade", contentType: "general" }), to: "/grades/$grade", params: { grade: grade.slug } },
                { label: bi(lesson.title, { fieldName: "title", contentType: "title" }) },
              ]} />
            </div>
            <Link
              to="/grades/$grade"
              params={{ grade: grade.slug }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 md:mb-5 md:text-muted-foreground md:hover:text-primary"
            >
              <ChevronLeft className={`h-4 w-4 shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} />
              <span>
                {lang === "ar"
                  ? `العودة إلى ${bi(grade.name, { fieldName: "grade", contentType: "general" })}`
                  : `${tr("back_to_grade")} ${bi(grade.name, { fieldName: "grade", contentType: "general" })}`}
              </span>
            </Link>
            <div className="mt-2 hidden text-xs uppercase tracking-[0.22em] text-primary md:mb-2 md:block">
              {bi(lesson.subject, { fieldName: "subject", contentType: "general" })} · {bi(lesson.unit, { fieldName: "unit", contentType: "general" })}
            </div>
            <TranslatedContentShell>
            <h1 className="mt-2 font-display text-xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere] md:mt-0 md:text-5xl md:leading-tight">
              {bi(lesson.title, { fieldName: "title", contentType: "title" })}
            </h1>
            </TranslatedContentShell>
            <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-primary md:hidden">
              {bi(lesson.subject, { fieldName: "subject", contentType: "general" })} · {bi(lesson.unit, { fieldName: "unit", contentType: "general" })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:mt-4 md:gap-4 md:text-sm">
              <span className="order-1 inline-flex items-center gap-1.5 md:order-3"><BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" /> {bi(grade.name, { fieldName: "grade", contentType: "general" })}</span>
              <span className="order-2 inline-flex items-center gap-1.5 md:order-1"><Clock className="h-3.5 w-3.5 md:h-4 md:w-4" /> {lesson.duration} {tr("minutes")}</span>
              <span className="order-3 inline-flex items-center gap-1.5 md:order-2"><HelpCircle className="h-3.5 w-3.5 md:h-4 md:w-4" /> {quizCount} Q</span>
            </div>
          </div>
        </section>

        <div className="container-page py-3 md:hidden">
          <div className="grid grid-cols-2 gap-2">
            <a href="#lesson-video" className={resourceBtn}>
              <Video className="h-4 w-4 shrink-0" />
              {tr("ls_video")}
            </a>
            <a href="#lesson-pdf" className={resourceBtn}>
              <FileText className="h-4 w-4 shrink-0" />
              PDF
            </a>
            <a href="#lesson-worksheet" className={resourceBtn}>
              <ClipboardList className="h-4 w-4 shrink-0" />
              {tr("ls_worksheet")}
            </a>
            {hasQuiz && (
              <a href="#lesson-quiz" className={resourceBtn}>
                <HelpCircle className="h-4 w-4 shrink-0" />
                {tr("nav_quizzes")}
              </a>
            )}
          </div>
        </div>

        <section className="container-page py-4 md:py-12 grid gap-4 md:gap-10 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2 space-y-4 md:space-y-6">
            {sections.map((s) => {
              const Icon = s.icon;
              const fallback = lang === "ar" ? "لم تتم إضافة هذا المحتوى بعد" : "This content has not been added yet";
              const body = (s.body ?? "").trim();
              return (
                <div key={s.key} className={lessonCard}>
                  <div className={lessonCardHeader}>
                    <div className={lessonCardIcon}>
                      <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <h2 className={lessonCardTitle}>{tr(s.key)}</h2>
                  </div>
                  {body ? (
                    <TranslatedContentShell>
                      <p className={lessonBody}>{body}</p>
                    </TranslatedContentShell>
                  ) : (
                    <p className="text-sm italic text-muted-foreground md:text-base">{fallback}</p>
                  )}
                </div>
              );
            })}

            {lesson.vocab.length > 0 && (
              <div className={lessonCard}>
                <div className={`${lessonCardHeader} md:mb-4`}>
                  <div className={lessonCardIcon}>
                    <FileText className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <h2 className={lessonCardTitle}>{tr("vocab")}</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                  {lesson.vocab.map((vw, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background p-3 md:p-4">
                      <div className="font-display text-base text-foreground md:text-lg [overflow-wrap:anywhere]">{bi(vw.term, { fieldName: `vocab_term_${i}`, contentType: "vocab_term" })}</div>
                      {bi(vw.def, { fieldName: `vocab_def_${i}`, contentType: "vocab_def" }) && (
                        <div className="mt-1 text-sm leading-[1.8] text-muted-foreground [overflow-wrap:anywhere]">
                          {bi(vw.def, { fieldName: `vocab_def_${i}`, contentType: "vocab_def" })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              id="lesson-video"
              tabIndex={-1}
              className={`scroll-mt-28 outline-none ${lessonCard}`}
            >
              <div className={`${lessonCardHeader} md:mb-4`}>
                <div className={lessonCardIcon}>
                  <Video className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <h2 className={lessonCardTitle}>{tr("ls_video")}</h2>
              </div>
              {lessonVideos.length > 0 ? (
                <div className="space-y-6">
                  {lessonVideos.map((video) => (
                    <div key={video.ytId + video.label}>
                      {lessonVideos.length > 1 && (
                        <div className="text-sm font-semibold text-primary mb-2">{video.label}</div>
                      )}
                      <div className="aspect-video w-full rounded-xl overflow-hidden">
                        <iframe
                          className="h-full w-full"
                          src={`https://www.youtube.com/embed/${video.ytId}`}
                          title={`${bi(lesson.title, { fieldName: "title", contentType: "title" })} — ${video.label}`}
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ))}
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

            <LessonDownloads custom={custom} lessonCard={lessonCard} lessonCardHeader={lessonCardHeader} lessonCardIcon={lessonCardIcon} lessonCardTitle={lessonCardTitle} resourceBtn={resourceBtn} />

            {hasQuiz && (
              <div id="lesson-quiz" tabIndex={-1} className="scroll-mt-28 outline-none">
                <LessonQuizStudent
                  lessonId={custom.id}
                  questions={custom.quiz}
                  gradeName={grade.name}
                  lessonTitle={lesson.title}
                />
              </div>
            )}
          </div>

          <aside className="min-w-0 space-y-4 md:space-y-6">
            {lessonFiles.length > 0 && (
              <div className={`${lessonCard} md:sticky md:top-24`}>
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground md:mb-2">{tr("ls_resources")}</div>
                <div className="space-y-2">
                  {lessonFiles.map((f: CustomFile) => (
                    <a key={f.id} href={f.fileUrl} download={f.fileName}
                      className={`${resourceBtn} justify-start text-xs md:text-sm`}>
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{bi(f.title, { fieldName: `file_${f.id}`, contentType: "resource_label" })} <span className="opacity-60">· {f.type.toUpperCase()}</span></span>
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

function LessonDownloads({
  custom,
  lessonCard,
  lessonCardHeader,
  lessonCardIcon,
  lessonCardTitle,
  resourceBtn,
}: {
  custom?: CustomLesson;
  lessonCard: string;
  lessonCardHeader: string;
  lessonCardIcon: string;
  lessonCardTitle: string;
  resourceBtn: string;
}) {
  const items = custom ? studentDownloadItems(custom) : [];
  const pdfItems = items.filter(
    (item) =>
      item.key === "pdfArUrl" ||
      item.key === "pdfEnUrl" ||
      item.key === "pptArUrl" ||
      item.key === "pptEnUrl",
  );
  const worksheetItems = items.filter(
    (item) => item.key === "worksheetArUrl" || item.key === "worksheetEnUrl",
  );
  const sectionProps = { lessonCard, lessonCardHeader, lessonCardIcon, lessonCardTitle, resourceBtn };

  if (items.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6">
        <LessonFileSection
          id="lesson-pdf"
          title="PDF"
          items={[]}
          emptyEn="No PDF attached to this lesson."
          emptyAr="لا يوجد PDF مرفق لهذا الدرس."
          {...sectionProps}
        />
        <LessonFileSection
          id="lesson-worksheet"
          title="Worksheet / ورقة العمل"
          items={[]}
          emptyEn="No worksheet attached to this lesson."
          emptyAr="لا توجد ورقة عمل مرفقة لهذا الدرس."
          {...sectionProps}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <LessonFileSection
        id="lesson-pdf"
        title="PDF"
        items={pdfItems}
        emptyEn="No PDF attached to this lesson."
        emptyAr="لا يوجد PDF مرفق لهذا الدرس."
        {...sectionProps}
      />
      <LessonFileSection
        id="lesson-worksheet"
        title="Worksheet / ورقة العمل"
        items={worksheetItems}
        emptyEn="No worksheet attached to this lesson."
        emptyAr="لا توجد ورقة عمل مرفقة لهذا الدرس."
        {...sectionProps}
      />
    </div>
  );
}

function LessonFileSection({
  id,
  title,
  items,
  emptyEn,
  emptyAr,
  lessonCard,
  lessonCardHeader,
  lessonCardIcon,
  lessonCardTitle,
  resourceBtn,
}: {
  id: string;
  title: string;
  items: StudentDownloadItem[];
  emptyEn: string;
  emptyAr: string;
  lessonCard: string;
  lessonCardHeader: string;
  lessonCardIcon: string;
  lessonCardTitle: string;
  resourceBtn: string;
}) {
  return (
    <div
      id={id}
      tabIndex={-1}
      className={`scroll-mt-28 outline-none ${lessonCard}`}
    >
      <div className={`${lessonCardHeader} md:mb-4`}>
        <div className={lessonCardIcon}>
          <FileText className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <h2 className={lessonCardTitle}>{title}</h2>
      </div>
      {items.length > 0 ? (
        <DownloadGrid items={items} resourceBtn={resourceBtn} />
      ) : (
        <p className="text-sm leading-[1.8] text-muted-foreground md:text-base">
          {emptyAr}
          <br />
          {emptyEn}
        </p>
      )}
    </div>
  );
}

function DownloadGrid({ items, resourceBtn }: { items: StudentDownloadItem[]; resourceBtn: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-2.5">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          download={fileNameFromUrl(item.url)}
          className={resourceBtn}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{item.label}</span>
        </a>
      ))}
    </div>
  );
}
