import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { enforceStudentOwnGradeLesson } from "@/lib/student-route-guard";
import { useStudentWorkspaceChrome } from "@/hooks/use-student-workspace-chrome";
import { StudentDashboardShell } from "@/components/student-dashboard-shell";
import {
  ChevronLeft, Clock, Target, BookOpen,
  FileText, Video, HelpCircle, Download, ClipboardList,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useI18n, L, type TKey, prefetchEducationalTranslations, useLessonTranslationScope } from "@/lib/i18n";
import { biSourceForTranslation, type EducationalContentType, type EducationalField } from "@/lib/translate-content";
import type { Bi } from "@/lib/curriculum";
import { LessonVocabularyCards } from "@/components/lesson-vocabulary-cards";
import { getGrade } from "@/lib/curriculum";
import { useResolveLesson, lessonVideoEmbeds, type CustomFile, type CustomLesson, useCMS } from "@/lib/cms";
import { studentDownloadItems, fileNameFromUrl, type StudentDownloadItem } from "@/lib/lesson-bilingual-files";
import { LessonQuizStudent } from "@/components/lesson-quiz-student";
import { LessonQuizPreview } from "@/components/lesson-quiz-preview";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import { useLessonHashScroll } from "@/lib/lesson-hash-scroll";
import { TranslatedContentShell } from "@/components/translation-loading-indicator";
import { pageHeadTitle } from "@/lib/page-head";
import videoPlaceholder from "@/assets/video-placeholder.jpg";

export const Route = createFileRoute("/grades/$grade/$lesson")({
  beforeLoad: async ({ params }) => {
    await blockParentFromStudentRoutes();
    await enforceStudentOwnGradeLesson(params.grade, params.lesson);
  },
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { gradeSlug: params.grade, lessonSlug: params.lesson };
  },
  head: () => ({ meta: [{ title: pageHeadTitle("lesson") }] }),
  component: LessonRoutePage,
  notFoundComponent: () => <div className="container-page py-20">Lesson not found.</div>,
  errorComponent: ({ error }) => <div className="container-page py-20">Error: {error.message}</div>,
});

function LessonRoutePage() {
  const { gradeSlug, lessonSlug } = Route.useLoaderData();
  const chrome = useStudentWorkspaceChrome();
  const body = (
    <LessonPageBody
      gradeSlug={gradeSlug}
      lessonSlug={lessonSlug}
      shell={chrome.status === "student" ? "student" : "public"}
    />
  );

  if (chrome.status === "student") {
    return <StudentDashboardShell value={chrome.shell}>{body}</StudentDashboardShell>;
  }

  return body;
}

export function LessonPageBody({
  gradeSlug,
  lessonSlug,
  gradesBasePath = "/grades",
  shell = "public",
}: {
  gradeSlug: string;
  lessonSlug: string;
  gradesBasePath?: "/grades" | "/admin/grades";
  shell?: "public" | "admin" | "student";
}) {
  const { loading: cmsLoading } = useCMS();
  const resolved = useResolveLesson(gradeSlug, lessonSlug);
  const { tr, lang, dir, bi } = useI18n();
  const gradeRoute =
    gradesBasePath === "/admin/grades" ? "/admin/grades/$grade" : "/grades/$grade";
  const gradesIndexRoute = gradesBasePath;
  const showPublicChrome = shell === "public";
  const isStudentShell = shell === "student";
  const lessonReady = !cmsLoading && Boolean(resolved?.lesson);
  useLessonTranslationScope(lessonSlug);

  useEffect(() => {
    if (!lessonReady || !resolved?.lesson) return;
    const lesson = resolved.lesson;
    const fields: EducationalField[] = [];
    const pushBi = (bi: Bi, fieldName: string, contentType: EducationalContentType) => {
      const source = biSourceForTranslation(bi, lang);
      if (!source) return;
      fields.push({
        fieldName,
        contentType,
        text: source.text,
        sourceLanguage: source.sourceLanguage,
      });
    };

    pushBi(lesson.title, "title", "title");
    pushBi(lesson.outcome, "outcome", "outcome");
    pushBi(lesson.explanation, "explanation", "content");
    pushBi(resolved.grade.name, "grade", "general");
    pushBi(lesson.subject, "subject", "general");
    pushBi(lesson.unit, "unit", "general");

    for (const f of resolved.lessonFiles) {
      pushBi(f.title, `file_${f.id}`, "resource_label");
    }

    for (const [i, v] of lesson.vocab.entries()) {
      const wordSource = biSourceForTranslation(v.word, lang);
      if (wordSource) {
        fields.push({
          fieldName: `vocab_term_${i}`,
          contentType: "vocab_term",
          text: wordSource.text,
          sourceLanguage: wordSource.sourceLanguage,
        });
      }
      const meaningSource = biSourceForTranslation(v.meaning, lang);
      if (meaningSource) {
        fields.push({
          fieldName: `vocab_def_${i}`,
          contentType: "vocab_def",
          text: meaningSource.text,
          sourceLanguage: meaningSource.sourceLanguage,
        });
      }
    }

    for (const [qi, q] of normalizeQuizList(resolved.custom?.quiz ?? lesson.quiz).entries()) {
      pushBi(q.q, `quiz_q_${qi}`, "quiz_question");
      for (const [oi, opt] of q.options.entries()) {
        pushBi(opt, `quiz_q_${qi}_opt_${oi}`, "quiz_option");
      }
    }

    if (fields.length > 0) prefetchEducationalTranslations(lessonSlug, fields, lang);
  }, [lessonSlug, lang, lessonReady, resolved]);

  useLessonHashScroll(lessonReady, lessonSlug);

  if (cmsLoading) {
    return (
      <div className={showPublicChrome ? "min-h-screen flex flex-col" : ""}>
        {showPublicChrome ? <SiteHeader /> : null}
        <main className={`${showPublicChrome ? "flex-1 " : ""}container-page py-20 text-muted-foreground`}>
          {L("Loading lesson…", "جارٍ تحميل الدرس…")[lang]}
        </main>
        {showPublicChrome ? <SiteFooter /> : null}
      </div>
    );
  }

  if (!resolved?.grade) {
    return <div className="container-page py-20">Grade not found.</div>;
  }
  const { grade, lesson, custom, lessonFiles } = resolved;
  if (!lesson) {
    return (
      <div className={showPublicChrome ? "min-h-screen flex flex-col" : ""}>
        {showPublicChrome ? <SiteHeader /> : null}
        <main className={`${showPublicChrome ? "flex-1 " : ""}container-page py-20`}>
          <Link to={gradeRoute} params={{ grade: grade.slug }} className="text-primary hover:text-primary inline-flex items-center gap-2">
            <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            {tr("back_to_grade")} · {bi(grade.name)}
          </Link>
          <p className="mt-6 text-muted-foreground">{L("Lesson not found.", "الدرس غير موجود.")[lang]}</p>
        </main>
        {showPublicChrome ? <SiteFooter /> : null}
      </div>
    );
  }

  const lessonMeta = { lessonId: lessonSlug };

  const sections: Array<{ icon: typeof Target; key: TKey; body: string }> = [
    { icon: Target, key: "ls_outcome", body: bi(lesson.outcome, { ...lessonMeta, fieldName: "outcome", contentType: "outcome" }) },
    { icon: BookOpen, key: "ls_content", body: bi(lesson.explanation, { ...lessonMeta, fieldName: "explanation", contentType: "content" }) },
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
    <div className={showPublicChrome ? "min-h-screen flex flex-col" : ""}>
      {showPublicChrome ? <SiteHeader /> : null}
      <main className={`${showPublicChrome ? "flex-1 " : ""}overflow-x-hidden`}>
        <section className="bg-gradient-to-b from-cream to-background border-b border-border">
          <div className={`${showPublicChrome ? "container-page" : ""} pt-3 pb-4 md:py-10`}>
            <div className="mb-5 hidden md:block">
              <Breadcrumbs items={
                isStudentShell
                  ? [
                      {
                        label: bi(grade.name, { ...lessonMeta, fieldName: "grade", contentType: "general" }),
                        to: gradeRoute,
                        params: { grade: grade.slug },
                      },
                      { label: bi(lesson.title, { ...lessonMeta, fieldName: "title", contentType: "title" }) },
                    ]
                  : [
                      { label: tr("nav_stages"), to: gradesIndexRoute },
                      {
                        label: bi(grade.name, { ...lessonMeta, fieldName: "grade", contentType: "general" }),
                        to: gradeRoute,
                        params: { grade: grade.slug },
                      },
                      { label: bi(lesson.title, { ...lessonMeta, fieldName: "title", contentType: "title" }) },
                    ]
              } />
            </div>
            <Link
              to={gradeRoute}
              params={{ grade: grade.slug }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 md:mb-5 md:text-muted-foreground md:hover:text-primary"
            >
              <ChevronLeft className={`h-4 w-4 shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} />
              <span>
                {tr("back_to_grade")}{" "}
                {bi(grade.name, { ...lessonMeta, fieldName: "grade", contentType: "general" })}
              </span>
            </Link>
            <div className="mt-2 hidden text-xs uppercase tracking-[0.22em] text-primary md:mb-2 md:block">
              {bi(lesson.subject, { ...lessonMeta, fieldName: "subject", contentType: "general" })} · {bi(lesson.unit, { ...lessonMeta, fieldName: "unit", contentType: "general" })}
            </div>
            <TranslatedContentShell>
            <h1 className="mt-2 font-display text-xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere] md:mt-0 md:text-5xl md:leading-tight">
              {bi(lesson.title, { ...lessonMeta, fieldName: "title", contentType: "title" })}
            </h1>
            </TranslatedContentShell>
            <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-primary md:hidden">
              {bi(lesson.subject, { ...lessonMeta, fieldName: "subject", contentType: "general" })} · {bi(lesson.unit, { ...lessonMeta, fieldName: "unit", contentType: "general" })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:mt-4 md:gap-4 md:text-sm">
              <span className="order-1 inline-flex items-center gap-1.5 md:order-3"><BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" /> {bi(grade.name, { ...lessonMeta, fieldName: "grade", contentType: "general" })}</span>
              <span className="order-2 inline-flex items-center gap-1.5 md:order-1"><Clock className="h-3.5 w-3.5 md:h-4 md:w-4" /> {lesson.duration} {tr("minutes")}</span>
              <span className="order-3 inline-flex items-center gap-1.5 md:order-2"><HelpCircle className="h-3.5 w-3.5 md:h-4 md:w-4" /> {quizCount} Q</span>
            </div>
          </div>
        </section>

        <div className={`${showPublicChrome ? "container-page" : ""} py-3 md:hidden`}>
          <div className="grid grid-cols-2 gap-2">
            <a href="#lesson-video" className={resourceBtn}>
              <Video className="h-4 w-4 shrink-0" />
              {tr("ls_video")}
            </a>
            <a href="#lesson-pdf" className={resourceBtn}>
              <FileText className="h-4 w-4 shrink-0" />
              {tr("ls_pdf")}
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

        <section className={`${showPublicChrome ? "container-page" : ""} py-4 md:py-12 grid gap-4 md:gap-10 lg:grid-cols-3`}>
          <div className="min-w-0 lg:col-span-2 space-y-4 md:space-y-6">
            {sections.map((s) => {
              const Icon = s.icon;
              const fallback = L("This content has not been added yet", "لم تتم إضافة هذا المحتوى بعد")[lang];
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

            <LessonVocabularyCards items={lesson.vocab} lessonMeta={lessonMeta} />

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
                          title={`${bi(lesson.title, { ...lessonMeta, fieldName: "title", contentType: "title" })} — ${video.label}`}
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
                      <div className="mt-3 font-display text-lg">{L("No video uploaded yet", "لم يتم رفع فيديو بعد")[lang]}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <LessonDownloads custom={custom} lessonCard={lessonCard} lessonCardHeader={lessonCardHeader} lessonCardIcon={lessonCardIcon} lessonCardTitle={lessonCardTitle} resourceBtn={resourceBtn} />

            {hasQuiz && custom && (
              <div id="lesson-quiz" tabIndex={-1} className="scroll-mt-28 outline-none">
                {shell === "admin" ? (
                  <LessonQuizPreview
                    lessonId={lessonSlug}
                    questions={custom.quiz}
                    gradeName={grade.name}
                    lessonTitle={lesson.title}
                  />
                ) : (
                  <LessonQuizStudent
                    lessonId={lessonSlug}
                    questions={custom.quiz}
                    gradeName={grade.name}
                    lessonTitle={lesson.title}
                  />
                )}
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
                      <span className="min-w-0 [overflow-wrap:anywhere]">{bi(f.title, { ...lessonMeta, fieldName: `file_${f.id}`, contentType: "resource_label" })} <span className="opacity-60">· {f.type.toUpperCase()}</span></span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
      {showPublicChrome ? <SiteFooter /> : null}
      {showPublicChrome ? <AskMrAhmed /> : null}
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
  const { lang, tr } = useI18n();
  const items = custom ? studentDownloadItems(custom, lang) : [];
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
  const pdfEmpty = L("No PDF attached to this lesson.", "لا يوجد PDF مرفق لهذا الدرس.");
  const worksheetEmpty = L(
    "No worksheet attached to this lesson.",
    "لا توجد ورقة عمل مرفقة لهذا الدرس.",
  );

  if (items.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6">
        <LessonFileSection
          id="lesson-pdf"
          title={tr("ls_pdf")}
          items={[]}
          emptyEn={pdfEmpty.en}
          emptyAr={pdfEmpty.ar}
          {...sectionProps}
        />
        <LessonFileSection
          id="lesson-worksheet"
          title={tr("ls_worksheet")}
          items={[]}
          emptyEn={worksheetEmpty.en}
          emptyAr={worksheetEmpty.ar}
          {...sectionProps}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <LessonFileSection
        id="lesson-pdf"
        title={tr("ls_pdf")}
        items={pdfItems}
        emptyEn={pdfEmpty.en}
        emptyAr={pdfEmpty.ar}
        {...sectionProps}
      />
      <LessonFileSection
        id="lesson-worksheet"
        title={tr("ls_worksheet")}
        items={worksheetItems}
        emptyEn={worksheetEmpty.en}
        emptyAr={worksheetEmpty.ar}
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
  const { lang } = useI18n();

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
          {L(emptyEn, emptyAr)[lang]}
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
