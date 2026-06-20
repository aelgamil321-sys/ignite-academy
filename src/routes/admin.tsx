import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import {useI18n, L } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson, type CustomVideo, type CustomFile, type CustomArticle, type FileType, type ArticleCategory } from "@/lib/cms";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/categories";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { formatStudentAcademics, normalizeIslamicGroup, normalizeStudentSection } from "@/lib/student-academics";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import type { QuizQuestion } from "@/lib/curriculum";
import { quizQuestionsForForm, serializeQuizForSave } from "@/lib/lesson-quiz";
import {
  BookOpen, Video, FileUp, Newspaper, Folder, GraduationCap,
  Layers, ClipboardCheck, Megaphone, Plus, Trash2, Eye, EyeOff, Save, X, ExternalLink, LogOut, Pencil, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { uploadToStorage, formatError, uploadPendingBilingualLessonFiles } from "@/lib/upload";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminSidebar, type AdminTab } from "@/components/admin-sidebar";
import { DeleteLessonButton } from "@/components/admin-manage-lessons";
import { LessonBilingualFileFields } from "@/components/lesson-bilingual-file-fields";
import { LessonQuizBuilder } from "@/components/lesson-quiz-builder";
import {
  bilingualFilesFromLesson,
  bilingualFilesSavePayload,
  bilingualFilesToLessonUpdate,
  mergeBilingualFiles,
  BILINGUAL_LESSON_FILE_SLOTS,
  EMPTY_BILINGUAL_LESSON_FILES,
  EMPTY_BILINGUAL_PENDING_FILES,
  hasPendingBilingualFiles,
  type BilingualLessonFiles,
  type BilingualLessonPendingFiles,
} from "@/lib/lesson-bilingual-files";

export const adminRouteSearch = (search: Record<string, unknown>) => ({
  tab: typeof search.tab === "string" ? (search.tab as AdminTab) : undefined,
});

export const adminRouteHead = () => ({
  meta: [
    { title: "Admin Dashboard — Ignite Islamic Academy" },
    { name: "description", content: "Manage lessons, articles, videos, quizzes, resources and announcements for Ignite Islamic Academy." },
    { name: "robots", content: "noindex,nofollow" },
  ],
  links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/admin" }],
});

export function AdminGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!active) return;
      if (!u.user) { navigate({ to: "/admin-login" }); return; }
      const { data, error } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!active) return;
      if (error || !data) {
        await supabase.auth.signOut();
        navigate({ to: "/admin-login" });
        return;
      }
      setEmail(u.user.email ?? "");
      setState("ok");
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/admin-login" });
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  if (state !== "ok") {
    return (
      <PageShell eyebrow="Admin" title="Admin Dashboard" lead="Checking access…" crumbs={[{ label: "Admin" }]}>
        <div className="text-sm text-muted-foreground">Verifying your access…</div>
      </PageShell>
    );
  }
  return <AdminLayoutShell email={email} />;
}

async function handleLogout(navigate: ReturnType<typeof useNavigate>) {
  await supabase.auth.signOut();
  toast.success("Signed out");
  navigate({ to: "/admin-login" });
}

type Tab = AdminTab;


function parseAdminTab(search: Record<string, unknown>): Tab | undefined {
  return typeof search.tab === "string" ? (search.tab as Tab) : undefined;
}

export function AdminLayoutShell({ email }: { email: string }) {
  const navigate = useNavigate();
  const { lang, bi, biMaybe } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const tab = parseAdminTab(search) ?? "overview";
  const onLessonsList = pathname === "/admin/lessons" || pathname === "/admin/lessons/";
  const onLessonsEdit = pathname.startsWith("/admin/lessons/edit/");
  const onQuizSubmissions =
    pathname === "/admin/quiz-submissions" || pathname === "/admin/quiz-submissions/";
  const onAssignments =
    pathname === "/admin/assignments" || pathname === "/admin/assignments/";
  const onAnalytics =
    pathname === "/admin/analytics" || pathname === "/admin/analytics/";

  const adminLabel = L("Admin", "الإدارة")[lang];
  const manageLessonsLabel = L("Manage Lessons", "إدارة الدروس")[lang];
  const quizSubmissionsLabel = L("Quiz Submissions", "إرسالات الاختبارات")[lang];
  const assignmentsLabel = L("Assignments Management", "إدارة الواجبات")[lang];
  const analyticsLabel = L("Analytics", "التحليلات")[lang];
  const title = onAnalytics
    ? analyticsLabel
    : onAssignments
    ? assignmentsLabel
    : onQuizSubmissions
    ? quizSubmissionsLabel
    : onLessonsList
      ? manageLessonsLabel
      : onLessonsEdit
        ? L("Edit Lesson", "تعديل الدرس")[lang]
        : L("Admin Dashboard", "لوحة الإدارة")[lang];
  const lead = onAnalytics
    ? L(
        "Compare student quiz performance and certificates by grade, section, and Islamic group.",
        "قارن أداء الطلاب في الاختبارات والشهادات حسب الصف والشعبة والمجموعة الإسلامية.",
      )[lang]
    : onQuizSubmissions
    ? L("Review student quiz submissions and grade essay answers.", "راجع إرسالات الطلاب وقيّم الإجابات المقالية.")[lang]
    : onAssignments
    ? L(
        "Create assignments, review submissions, and grade student work.",
        "أنشئ الواجبات وراجع الإرسالات وقيّم أعمال الطلاب.",
      )[lang]
    : onLessonsList
      ? L("View and edit all lessons.", "عرض وتعديل جميع الدروس.")[lang]
      : onLessonsEdit
        ? L("Update the existing lesson.", "تحديث بيانات الدرس الحالي.")[lang]
        : L("Create, edit, publish, and manage all content via Supabase CMS.",
            "أنشئ المحتوى وحرّره وانشره وأدره عبر نظام إدارة المحتوى.")[lang];
  const crumbs = onAnalytics
    ? [{ label: adminLabel, to: "/admin" }, { label: analyticsLabel }]
    : onQuizSubmissions
    ? [{ label: adminLabel, to: "/admin" }, { label: quizSubmissionsLabel }]
    : onAssignments
    ? [{ label: adminLabel, to: "/admin" }, { label: assignmentsLabel }]
    : onLessonsList
      ? [{ label: adminLabel, to: "/admin" }, { label: manageLessonsLabel }]
      : onLessonsEdit
        ? [{ label: adminLabel, to: "/admin" }, { label: manageLessonsLabel, to: "/admin/lessons" }, { label: L("Edit", "تعديل")[lang] }]
        : [{ label: title }];

  return (
    <PageShell eyebrow={adminLabel} title={title} lead={lead} crumbs={crumbs}>
      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <AdminSidebar
          email={email}
          activeTab={tab}
          onLogout={() => void handleLogout(navigate)}
        />
        <div className="min-w-0 space-y-4">
          <Outlet />
        </div>
      </div>
    </PageShell>
  );
}

export function AdminDashboard() {
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const tabFromUrl = parseAdminTab(search);
  const [tab, setTab] = useState<Tab>(tabFromUrl ?? "overview");

  useEffect(() => {
    if (tabFromUrl) setTab(tabFromUrl);
  }, [tabFromUrl]);

  return (
    <>
      <DebugPanel />
      {tab === "overview" && <Overview />}
      {tab === "new-lesson" && <LessonForm />}
      {tab === "new-article" && <ArticleForm />}
      {tab === "new-video" && <VideoForm />}
      {tab === "new-file" && <FileForm />}
      {tab === "manage-resources" && <ManageResources />}
      {tab === "manage-grades" && <ManageGrades />}
      {tab === "manage-units" && <ManageUnits />}
      {tab === "manage-quizzes" && <ManageQuizzes />}
      {tab === "manage-announcements" && <ManageAnnouncements />}
      {tab === "manage-users" && <ManageUsers />}
      {tab === "manage-parent-links" && <ManageParentLinks />}
    </>
  );
}

function DebugPanel() {
  const { debug, refresh, lessons, videos, files, articles } = useCMS();
  const dotClass = debug.lastStatus === "error" ? "bg-red-500" : debug.lastStatus === "success" ? "bg-primary" : "bg-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <div className="font-sans text-sm font-semibold">CMS Debug</div>
        <button onClick={() => void refresh()} className="px-2 py-1 rounded border border-border hover:bg-muted text-[11px]">Refetch</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
        <div>Supabase connected: <span className={debug.connected ? "text-primary" : "text-red-500"}>{debug.connected ? "yes" : "no"}</span></div>
        <div>Current table: lessons</div>
        <div className="flex items-center gap-2">Last status: <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} /> {debug.lastAction} {debug.lastTable} → {debug.lastStatus}</div>
        <div>Last inserted ID: <span className="break-all">{debug.lastId || "—"}</span></div>
        <div className="sm:col-span-2 text-red-500 break-all">Last error: {debug.lastError || "—"}</div>
        <div className="sm:col-span-2 text-muted-foreground">Loaded — lessons: {lessons.length} · videos: {videos.length} · files: {files.length} · articles: {articles.length}</div>
      </div>
    </div>
  );
}

// ============ Overview ============
function Overview() {
  const { lang, bi, biMaybe } = useI18n();
  const { lessons, videos, files, articles } = useCMS();
  const totalGrades = grades.length;
  const stats = [
    { label: L("Lessons", "الدروس")[lang], value: lessons.filter((l) => l.published).length },
    { label: L("Videos", "الفيديوهات")[lang], value: videos.filter((v) => v.published).length },
    { label: L("Files", "الملفات")[lang], value: files.filter((f) => f.published).length },
    { label: L("Articles", "المقالات")[lang], value: articles.filter((a) => a.published).length },
    { label: L("Total Grades", "إجمالي الصفوف")[lang], value: totalGrades },
    { label: L("Subject Categories", "التصنيفات")[lang], value: SUBJECT_CATEGORIES.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="font-display text-3xl text-foreground">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Lesson Form ============
function lessonToFormState(l: CustomLesson) {
  return {
    grade: l.grade,
    unitEn: l.unit.en, unitAr: l.unit.ar,
    titleEn: l.title.en, titleAr: l.title.ar,
    outEn: l.outcome.en, outAr: l.outcome.ar,
    expEn: l.explanation.en, expAr: l.explanation.ar,
    vocEn: l.vocab.en, vocAr: l.vocab.ar,
    subjectCategory: l.subjectCategory,
    ytAr: (l.youtubeArUrl ?? "").trim(),
    ytEn: (l.youtubeEnUrl ?? "").trim() || (!(l.youtubeArUrl ?? "").trim() ? (l.youtubeUrl ?? "").trim() : ""),
    bilingualFiles: bilingualFilesFromLesson(l),
    quiz: quizQuestionsForForm(l.quiz),
    pub: l.published,
  };
}

function LessonForm({ editId, onSaved, onCancel }: { editId?: string | null; onSaved?: () => void; onCancel?: () => void }) {
  const isEditing = !!editId;
  const { lang, bi, biMaybe } = useI18n();
  const { refresh, lessons, updateLesson } = useCMS();
  const navigate = useNavigate();
  const [grade, setGrade] = useState(grades[0]?.slug ?? "");
  const [unitEn, setUnitEn] = useState(""); const [unitAr, setUnitAr] = useState("");
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [outEn, setOutEn] = useState(""); const [outAr, setOutAr] = useState("");
  const [expEn, setExpEn] = useState(""); const [expAr, setExpAr] = useState("");
  const [vocEn, setVocEn] = useState(""); const [vocAr, setVocAr] = useState("");
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>("quran");
  const [ytAr, setYtAr] = useState("");
  const [ytEn, setYtEn] = useState("");
  const [bilingualFiles, setBilingualFiles] = useState<BilingualLessonFiles>(EMPTY_BILINGUAL_LESSON_FILES);
  const [pendingFiles, setPendingFiles] = useState<BilingualLessonPendingFiles>(EMPTY_BILINGUAL_PENDING_FILES);
  const [quiz, setQuiz] = useState<QuizQuestion[]>(() => quizQuestionsForForm([]));
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftLessonId, setDraftLessonId] = useState<string | null>(null);
  const [dbg, setDbg] = useState({ clicked: false, valid: false, status: "" as "" | "success" | "error", error: "", id: "" });
  const bilingualLoadedFor = useRef<string | null>(null);
  const pendingFilesRef = useRef(pendingFiles);
  pendingFilesRef.current = pendingFiles;

  const setPendingFilesTracked: typeof setPendingFiles = (action) => {
    setPendingFiles((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      pendingFilesRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    if (!editId) return;
    const lesson = lessons.find((l) => l.id === editId);
    if (!lesson) return;
    const s = lessonToFormState(lesson);
    setGrade(s.grade);
    setUnitEn(s.unitEn); setUnitAr(s.unitAr);
    setTitleEn(s.titleEn); setTitleAr(s.titleAr);
    setOutEn(s.outEn); setOutAr(s.outAr);
    setExpEn(s.expEn); setExpAr(s.expAr);
    setVocEn(s.vocEn); setVocAr(s.vocAr);
    setSubjectCategory(s.subjectCategory);
    setYtAr(s.ytAr);
    setYtEn(s.ytEn);
    setQuiz(s.quiz);
    setPub(s.pub);
  }, [editId, lessons]);

  useEffect(() => {
    if (!editId) return;
    if (bilingualLoadedFor.current !== editId) {
      bilingualLoadedFor.current = null;
    }
    const lesson = lessons.find((l) => l.id === editId);
    if (!lesson) return;
    if (bilingualLoadedFor.current === editId) return;
    bilingualLoadedFor.current = editId;
    setBilingualFiles(lessonToFormState(lesson).bilingualFiles);
  }, [editId, lessons]);

  const resetForm = () => {
    setTitleEn(""); setTitleAr(""); setOutEn(""); setOutAr(""); setExpEn(""); setExpAr("");
    setVocEn(""); setVocAr(""); setYtAr(""); setYtEn("");
    setBilingualFiles(EMPTY_BILINGUAL_LESSON_FILES);
    setPendingFiles(EMPTY_BILINGUAL_PENDING_FILES);
    setQuiz(quizQuestionsForForm([]));
    setUnitEn(""); setUnitAr("");
    setDraftLessonId(null);
  };

  const buildLessonPayload = (publish: boolean, omitFileUrls = false) => {
    const ytArTrim = ytAr.trim();
    const ytEnTrim = ytEn.trim();
    const legacyYoutube = ytEnTrim || ytArTrim;

    return {
      grade: normalizeGradeSlug(grade),
      unit: { en: unitEn, ar: unitAr },
      title: { en: titleEn, ar: titleAr },
      outcome: { en: outEn, ar: outAr },
      explanation: { en: expEn, ar: expAr },
      vocab: { en: vocEn, ar: vocAr },
      subject_category: subjectCategory,
      youtube_url: legacyYoutube,
      youtube_url_ar: ytArTrim,
      youtube_url_en: ytEnTrim,
      ppt_ar_url: omitFileUrls ? null : bilingualFiles.pptArUrl,
      ppt_en_url: omitFileUrls ? null : bilingualFiles.pptEnUrl,
      worksheet_ar_url: omitFileUrls ? null : bilingualFiles.worksheetArUrl,
      worksheet_en_url: omitFileUrls ? null : bilingualFiles.worksheetEnUrl,
      pdf_ar_url: omitFileUrls ? null : bilingualFiles.pdfArUrl,
      pdf_en_url: omitFileUrls ? null : bilingualFiles.pdfEnUrl,
      quiz: serializeQuizForSave(quiz),
      published: publish,
    };
  };

  const lessonMetadataForCms = (publish: boolean) => {
    const ytArTrim = ytAr.trim();
    const ytEnTrim = ytEn.trim();
    const legacyYoutube = ytEnTrim || ytArTrim;
    return {
      grade: normalizeGradeSlug(grade),
      unit: { en: unitEn, ar: unitAr },
      title: { en: titleEn, ar: titleAr },
      outcome: { en: outEn, ar: outAr },
      explanation: { en: expEn, ar: expAr },
      vocab: { en: vocEn, ar: vocAr },
      subjectCategory,
      youtubeUrl: legacyYoutube,
      youtubeArUrl: ytArTrim,
      youtubeEnUrl: ytEnTrim,
      quiz: serializeQuizForSave(quiz),
      published: publish,
    };
  };

  const rejectEmbeddedDataUrls = (payload: Record<string, unknown>): string | null => {
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "string" && v.startsWith("data:")) {
        return `Field ${k} contains an embedded file. Re-upload the file before saving.`;
      }
    }
    return null;
  };

  const submit = async (publish: boolean) => {
    setDbg({ clicked: true, valid: false, status: "", error: "", id: "" });
    if (!titleEn.trim() || !titleAr.trim()) {
      const msg = L("Title (English) and Title (Arabic) are required", "العنوان (إنجليزي) والعنوان (عربي) مطلوبان")[lang];
      toast.error(msg);
      setDbg((d) => ({ ...d, valid: false, status: "error", error: msg }));
      return;
    }
    if (!grade) {
      const msg = L("Grade is required", "الصف مطلوب")[lang];
      toast.error(msg);
      setDbg((d) => ({ ...d, valid: false, status: "error", error: msg }));
      return;
    }
    setDbg((d) => ({ ...d, valid: true }));
    setSaving(true);

    const payload = buildLessonPayload(publish);
    const embeddedError = rejectEmbeddedDataUrls(payload);
    if (embeddedError) {
      toast.error(embeddedError);
      setDbg({ clicked: true, valid: true, status: "error", error: embeddedError, id: editId ?? draftLessonId ?? "" });
      setSaving(false);
      return;
    }

    const ytArTrim = ytAr.trim();
    const ytEnTrim = ytEn.trim();
    const legacyYoutube = ytEnTrim || ytArTrim;

    try {
      if (isEditing && editId) {
        const existing = lessons.find((l) => l.id === editId);
        const baselineFiles = existing ? bilingualFilesFromLesson(existing) : EMPTY_BILINGUAL_LESSON_FILES;
        const mergedFiles = mergeBilingualFiles(bilingualFiles, baselineFiles);
        console.log("[LessonForm] table=lessons action=update id=", editId, "payload=", payload);
        await updateLesson(editId, {
          grade: payload.grade,
          unit: payload.unit,
          title: payload.title,
          outcome: payload.outcome,
          explanation: payload.explanation,
          vocab: payload.vocab,
          subjectCategory: payload.subject_category,
          youtubeUrl: legacyYoutube,
          youtubeArUrl: ytArTrim,
          youtubeEnUrl: ytEnTrim,
          quiz: payload.quiz,
          published: payload.published,
          ...bilingualFilesSavePayload(mergedFiles, baselineFiles),
        });
        setDbg({ clicked: true, valid: true, status: "success", error: "", id: editId });
        toast.success(L("Lesson updated successfully!", "تم تحديث الدرس بنجاح!")[lang]);
        await refresh();
        onSaved?.();
        return;
      }

      const pending = pendingFilesRef.current;
      const hasPending = hasPendingBilingualFiles(pending);
      console.log("[LessonForm] new lesson save", {
        hasPending,
        pendingKeys: BILINGUAL_LESSON_FILE_SLOTS.filter((s) => pending[s.key]).map((s) => s.key),
      });
      let lessonId = draftLessonId;

      if (!lessonId) {
        const insertPayload = buildLessonPayload(hasPending ? false : publish, hasPending);
        console.log("[LessonForm] table=lessons action=insert payload=", insertPayload);
        const { data, error } = await supabase
          .from("lessons")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(insertPayload as any)
          .select()
          .single();
        if (error) {
          console.error("[LessonForm] supabase error", {
            message: error.message, code: error.code, details: error.details, hint: error.hint,
          });
          throw error;
        }
        lessonId = (data as { id: string }).id;
        setDraftLessonId(lessonId);
      } else {
        console.log("[LessonForm] table=lessons action=update draft id=", lessonId);
        await updateLesson(lessonId, {
          ...lessonMetadataForCms(hasPending ? false : publish),
          ...(hasPending ? {} : bilingualFilesSavePayload(bilingualFiles, EMPTY_BILINGUAL_LESSON_FILES)),
        });
      }

      if (hasPending && lessonId) {
        console.log("[LessonForm] uploading pending bilingual files for lesson", lessonId);
        const { urls, failures } = await uploadPendingBilingualLessonFiles(lessonId, pending);
        const mergedFiles: BilingualLessonFiles = { ...bilingualFiles };
        for (const [key, url] of Object.entries(urls)) {
          if (url) mergedFiles[key as keyof BilingualLessonFiles] = url;
        }

        await updateLesson(lessonId, {
          ...lessonMetadataForCms(failures.length ? false : publish),
          ...bilingualFilesToLessonUpdate(mergedFiles),
        });

        setBilingualFiles(mergedFiles);
        setPendingFiles((prev) => {
          const next = { ...prev };
          for (const [key, url] of Object.entries(urls)) {
            if (url) next[key as keyof BilingualLessonPendingFiles] = null;
          }
          return next;
        });

        if (failures.length) {
          const detail = failures.map((f) => f.message).join(" · ");
          const msg = L(
            `Lesson saved as draft. Some files failed to upload: ${detail}`,
            `تم حفظ الدرس كمسودة. فشل رفع بعض الملفات: ${detail}`,
          )[lang];
          setDbg({ clicked: true, valid: true, status: "error", error: msg, id: lessonId });
          toast.error(msg);
          await refresh();
          return;
        }

        setDbg({ clicked: true, valid: true, status: "success", error: "", id: lessonId });
        toast.success(publish
          ? L("Lesson published!", "تم نشر الدرس!")[lang]
          : L("Saved as draft", "حُفظ كمسودة")[lang]);
        await refresh();
        setDraftLessonId(null);
        resetForm();
        if (publish) {
          navigate({ to: "/grades/$grade", params: { grade } });
        }
        return;
      }

      setDbg({ clicked: true, valid: true, status: "success", error: "", id: lessonId ?? "" });
      toast.success(publish
        ? L("Lesson published!", "تم نشر الدرس!")[lang]
        : L("Saved as draft", "حُفظ كمسودة")[lang]);
      await refresh();
      setDraftLessonId(null);
      resetForm();
      if (publish) {
        navigate({ to: "/grades/$grade", params: { grade } });
      }
    } catch (e) {
      const msg = formatError(e);
      setDbg({ clicked: true, valid: true, status: "error", error: msg, id: editId ?? draftLessonId ?? "" });
      toast.error(isEditing
        ? msg
        : L(`Save failed: ${msg}`, `فشل الحفظ: ${msg}`)[lang]);
    } finally {
      setSaving(false);
    }
  };


  if (isEditing && editId && !lessons.find((l) => l.id === editId)) {
    return (
      <FormCard title={L("Edit Lesson", "تعديل الدرس")[lang]}>
        <div className="text-sm text-muted-foreground">{L("Lesson not found.", "الدرس غير موجود.")[lang]}</div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
            <X className="h-4 w-4" /> {L("Back to lessons", "العودة إلى الدروس")[lang]}
          </button>
        )}
      </FormCard>
    );
  }

  const editLesson = editId ? lessons.find((l) => l.id === editId) : undefined;
  const activeLesson =
    editLesson ?? (draftLessonId ? lessons.find((l) => l.id === draftLessonId) : undefined);

  return (
    <FormCard title={isEditing ? L("Edit Lesson", "تعديل الدرس")[lang] : L("Add New Lesson", "إضافة درس جديد")[lang]}>
      <Row>
        <Field label={L("Grade", "الصف")[lang]}>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input">
            {grades.map((g) => <option key={g.slug} value={g.slug}>{bi(g.name)}</option>)}
          </select>
        </Field>
        <Field label={L("Subject Category", "التصنيف")[lang]}>
          <select value={subjectCategory} onChange={(e) => setSubjectCategory(e.target.value as SubjectCategory)} className="input">
            {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{bi(c.name)}</option>)}
          </select>
        </Field>
      </Row>
      <Row>
        <Field label={L("Unit (English)", "الوحدة (إنجليزي)")[lang]}><input className="input" value={unitEn} onChange={(e) => setUnitEn(e.target.value)} /></Field>
        <Field label={L("Unit (Arabic)", "الوحدة (عربي)")[lang]}><input className="input" dir="rtl" value={unitAr} onChange={(e) => setUnitAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Title (English)", "العنوان (إنجليزي)")[lang]} required><input className="input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
        <Field label={L("Title (Arabic)", "العنوان (عربي)")[lang]} required><input className="input" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Learning Outcome (EN)", "نواتج التعلّم (إنجليزي)")[lang]}><textarea className="input" rows={3} value={outEn} onChange={(e) => setOutEn(e.target.value)} /></Field>
        <Field label={L("Learning Outcome (AR)", "نواتج التعلّم (عربي)")[lang]}><textarea className="input" dir="rtl" rows={3} value={outAr} onChange={(e) => setOutAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Explanation (EN)", "الشرح (إنجليزي)")[lang]}><textarea className="input" rows={5} value={expEn} onChange={(e) => setExpEn(e.target.value)} /></Field>
        <Field label={L("Explanation (AR)", "الشرح (عربي)")[lang]}><textarea className="input" dir="rtl" rows={5} value={expAr} onChange={(e) => setExpAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Key Vocabulary (EN, comma separated)", "المفردات (إنجليزي، مفصولة بفواصل)")[lang]}><input className="input" value={vocEn} onChange={(e) => setVocEn(e.target.value)} /></Field>
        <Field label={L("Key Vocabulary (AR)", "المفردات (عربي)")[lang]}><input className="input" dir="rtl" value={vocAr} onChange={(e) => setVocAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("YouTube Video Link (Arabic)", "رابط فيديو يوتيوب (عربي)")[lang]}>
          <input className="input" dir="rtl" placeholder="https://www.youtube.com/watch?v=..." value={ytAr} onChange={(e) => setYtAr(e.target.value)} />
        </Field>
        <Field label={L("YouTube Video Link (English)", "رابط فيديو يوتيوب (إنجليزي)")[lang]}>
          <input className="input" placeholder="https://www.youtube.com/watch?v=..." value={ytEn} onChange={(e) => setYtEn(e.target.value)} />
        </Field>
      </Row>

      <LessonBilingualFileFields
        files={bilingualFiles}
        onChange={setBilingualFiles}
        lessonId={editId ?? draftLessonId ?? undefined}
        savedFiles={activeLesson ? bilingualFilesFromLesson(activeLesson) : undefined}
        deferUpload={!editId}
        pendingFiles={pendingFiles}
        onPendingFilesChange={setPendingFilesTracked}
      />

      <LessonQuizBuilder questions={quiz} onChange={setQuiz} />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-primary h-4 w-4" />
          {isEditing
            ? L("Published (uncheck to save as draft)", "منشور (ألغِ التحديد للحفظ كمسودة)")[lang]
            : L("Publish now (otherwise save as draft)", "النشر الآن (وإلا حفظ كمسودة)")[lang]}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {isEditing && onCancel && (
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              <X className="h-4 w-4" /> {L("Cancel", "إلغاء")[lang]}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => { void submit(pub); }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving
              ? L("Saving…", "جارٍ الحفظ…")[lang]
              : isEditing
                ? L("Save Changes", "حفظ التغييرات")[lang]
                : pub ? L("Publish", "نشر")[lang] : L("Save Draft", "حفظ كمسودة")[lang]}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background/60 p-3 text-xs font-mono space-y-1">
        <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Debug</div>
        <div>Button clicked: <span className={dbg.clicked ? "text-primary" : ""}>{dbg.clicked ? "yes" : "no"}</span></div>
        <div>Form valid: <span className={dbg.valid ? "text-primary" : "text-destructive"}>{dbg.clicked ? (dbg.valid ? "yes" : "no") : "—"}</span></div>
        <div>Supabase {isEditing ? "update" : "insert"}: <span className={dbg.status === "success" ? "text-primary" : dbg.status === "error" ? "text-destructive" : ""}>{dbg.status || "—"}</span></div>
        <div className="break-all">Last error: <span className="text-destructive">{dbg.error || "—"}</span></div>
        <div className="break-all">Last {isEditing ? "updated" : "inserted"} ID: <span className="text-primary">{dbg.id || "—"}</span></div>
      </div>
    </FormCard>
  );
}

// ============ Article Form ============
function ArticleForm() {
  const { lang, bi, biMaybe } = useI18n();
  const { addArticle } = useCMS();
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [bodyEn, setBodyEn] = useState(""); const [bodyAr, setBodyAr] = useState("");
  const [cat, setCat] = useState<ArticleCategory>("announcement");
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>("quran");
  const [img, setImg] = useState<string>("");
  const [pub, setPub] = useState(true);
  const onImg = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      toast.message(L("Uploading image…", "جارٍ رفع الصورة…")[lang]);
      const up = await uploadToStorage(f, "articles");
      setImg(up.url);
      toast.success(L("Image uploaded", "تم رفع الصورة")[lang]);
    } catch (err) { toast.error(formatError(err)); }
  };
  const submit = async () => {
    if (!titleEn || !titleAr) { toast.error(L("Title required", "العنوان مطلوب")[lang]); return; }
    try {
      await addArticle({
        title: { en: titleEn, ar: titleAr },
        content: { en: bodyEn, ar: bodyAr },
        category: cat,
        subjectCategory,
        imageUrl: img,
        published: pub,
      });
      toast.success(pub ? L("Article published!", "تم نشر المقال!")[lang] : L("Saved as draft", "حُفظ كمسودة")[lang]);
      setTitleEn(""); setTitleAr(""); setBodyEn(""); setBodyAr(""); setImg("");
    } catch (e) { toast.error(`Save failed: ${formatError(e)}`); console.error("Article save failed", e); }
  };

  return (
    <FormCard title={L("Add New Article", "إضافة مقال جديد")[lang]}>
      <Row>
        <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required><input className="input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
        <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required><input className="input" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Content (EN)", "المحتوى (إنجليزي)")[lang]}><textarea className="input" rows={8} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} /></Field>
        <Field label={L("Content (AR)", "المحتوى (عربي)")[lang]}><textarea className="input" dir="rtl" rows={8} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Article Type", "نوع المقال")[lang]}>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value as ArticleCategory)}>
            <option value="announcement">{L("Announcement", "إعلان")[lang]}</option>
            <option value="parent">{L("Parent Corner", "ركن الوالدين")[lang]}</option>
          </select>
        </Field>
        <Field label={L("Subject Category", "التصنيف")[lang]}>
          <select className="input" value={subjectCategory} onChange={(e) => setSubjectCategory(e.target.value as SubjectCategory)}>
            {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{bi(c.name)}</option>)}
          </select>
        </Field>
      </Row>
      <Field label={L("Featured Image", "صورة مميزة")[lang]}>
        <input type="file" accept="image/*" onChange={onImg} className="input" />
        {img && <img src={img} alt="" className="mt-2 max-h-40 rounded-lg border border-border" />}
      </Field>
      <PublishActions pub={pub} setPub={setPub} onSave={submit} lang={lang} />
    </FormCard>
  );
}

// ============ Video Form ============
function VideoForm() {
  const { lang, bi, biMaybe } = useI18n();
  const { addVideo } = useCMS();
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [descEn, setDescEn] = useState(""); const [descAr, setDescAr] = useState("");
  const [grade, setGrade] = useState(grades[0]?.slug ?? "");
  const [unitEn, setUnitEn] = useState(""); const [unitAr, setUnitAr] = useState("");
  const [category, setCategory] = useState<SubjectCategory>("quran");
  const [yt, setYt] = useState("");
  const [thumb, setThumb] = useState("");
  const [pub, setPub] = useState(true);
  const onThumb = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      toast.message(L("Uploading thumbnail…", "جارٍ رفع الصورة…")[lang]);
      const up = await uploadToStorage(f, "videos");
      setThumb(up.url);
      toast.success(L("Thumbnail uploaded", "تم رفع الصورة")[lang]);
    } catch (err) { toast.error(formatError(err)); }
  };
  const submit = async () => {
    if (!titleEn || !titleAr || !yt) { toast.error(L("Title and YouTube link required", "العنوان والرابط مطلوبان")[lang]); return; }
    try {
      await addVideo({ title: { en: titleEn, ar: titleAr }, description: { en: descEn, ar: descAr }, grade: normalizeGradeSlug(grade), unit: { en: unitEn, ar: unitAr }, category, youtubeUrl: yt, thumbnailUrl: thumb, published: pub });
      toast.success(pub ? L("Video published!", "تم نشر الفيديو!")[lang] : L("Saved as draft", "حُفظ كمسودة")[lang]);
      setTitleEn(""); setTitleAr(""); setDescEn(""); setDescAr(""); setUnitEn(""); setUnitAr(""); setYt(""); setThumb(""); setCategory("quran");
    } catch (e) { toast.error(`Save failed: ${formatError(e)}`); console.error("Video save failed", e); }
  };

  return (
    <FormCard title={L("Add New Video", "إضافة فيديو جديد")[lang]}>
      <Field label={L("Library Category", "تصنيف المكتبة")[lang]} required>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{bi(c.name)}</option>)}
        </select>
      </Field>
      <Row>
        <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required><input className="input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
        <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required><input className="input" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Description (EN)", "الوصف (إنجليزي)")[lang]}><textarea className="input" rows={3} value={descEn} onChange={(e) => setDescEn(e.target.value)} /></Field>
        <Field label={L("Description (AR)", "الوصف (عربي)")[lang]}><textarea className="input" dir="rtl" rows={3} value={descAr} onChange={(e) => setDescAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Grade", "الصف")[lang]}>
          <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {grades.map((g) => <option key={g.slug} value={g.slug}>{bi(g.name)}</option>)}
          </select>
        </Field>
        <Field label={L("Unit", "الوحدة")[lang]}>
          <input className="input" placeholder="EN" value={unitEn} onChange={(e) => setUnitEn(e.target.value)} />
          <input className="input mt-2" dir="rtl" placeholder="عربي" value={unitAr} onChange={(e) => setUnitAr(e.target.value)} />
        </Field>
      </Row>
      <Field label={L("YouTube Video Link", "رابط فيديو يوتيوب")[lang]} required>
        <input className="input" placeholder="https://www.youtube.com/watch?v=..." value={yt} onChange={(e) => setYt(e.target.value)} />
      </Field>
      <Field label={L("Thumbnail Upload", "صورة مصغّرة")[lang]}>
        <input type="file" accept="image/*" onChange={onThumb} className="input" />
        {thumb && <img src={thumb} alt="" className="mt-2 max-h-32 rounded-lg border border-border" />}
      </Field>
      <PublishActions pub={pub} setPub={setPub} onSave={submit} lang={lang} />
    </FormCard>
  );
}

// ============ File Form ============
function FileForm() {
  const { lang, bi, biMaybe } = useI18n();
  const { addFile, lessons } = useCMS();
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [grade, setGrade] = useState(grades[0]?.slug ?? "");
  const [unitEn, setUnitEn] = useState(""); const [unitAr, setUnitAr] = useState("");
  const [lesson, setLesson] = useState("");
  const [type, setType] = useState<FileType>("pdf");
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>("quran");
  const [file, setFile] = useState<{ url: string; name: string; size: string } | null>(null);
  const [pub, setPub] = useState(true);

  const gradeLessons = lessons
    .filter((l) => normalizeGradeSlug(l.grade) === normalizeGradeSlug(grade))
    .map((l) => ({ slug: l.id, title: bi(l.title) }));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      toast.message(L("Uploading file…", "جارٍ رفع الملف…")[lang]);
      const up = await uploadToStorage(f, `files/${type}`);
      setFile({ url: up.url, name: up.name, size: up.size });
      toast.success(L("File uploaded", "تم رفع الملف")[lang]);
    } catch (err) { toast.error(formatError(err)); }
  };
  const submit = async () => {
    if (!titleEn || !titleAr || !file) { toast.error(L("Title and file required", "العنوان والملف مطلوبان")[lang]); return; }
    try {
      await addFile({
        title: { en: titleEn, ar: titleAr },
        grade: normalizeGradeSlug(grade),
        unit: { en: unitEn, ar: unitAr },
        lesson,
        type,
        subjectCategory,
        fileUrl: file.url,
        fileName: file.name,
        size: file.size,
        published: pub,
      });
      toast.success(pub ? L("File uploaded!", "تم رفع الملف!")[lang] : L("Saved as draft", "حُفظ كمسودة")[lang]);
      setTitleEn(""); setTitleAr(""); setUnitEn(""); setUnitAr(""); setLesson(""); setFile(null);
    } catch (e) { toast.error(`Save failed: ${formatError(e)}`); console.error("File save failed", e); }
  };

  return (

    <FormCard title={L("Upload New File", "رفع ملف جديد")[lang]}>
      <Row>
        <Field label={L("Title (EN)", "العنوان (إنجليزي)")[lang]} required><input className="input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
        <Field label={L("Title (AR)", "العنوان (عربي)")[lang]} required><input className="input" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Grade", "الصف")[lang]}>
          <select className="input" value={grade} onChange={(e) => { setGrade(e.target.value); setLesson(""); }}>
            {grades.map((g) => <option key={g.slug} value={g.slug}>{bi(g.name)}</option>)}
          </select>
        </Field>
        <Field label={L("Lesson", "الدرس")[lang]}>
          <select className="input" value={lesson} onChange={(e) => setLesson(e.target.value)}>
            <option value="">{L("— None —", "— لا شيء —")[lang]}</option>
            {gradeLessons.map((l) => <option key={l.slug} value={l.slug}>{l.title}</option>)}
          </select>
        </Field>
      </Row>
      <Row>
        <Field label={L("Unit (EN)", "الوحدة (إنجليزي)")[lang]}><input className="input" value={unitEn} onChange={(e) => setUnitEn(e.target.value)} /></Field>
        <Field label={L("Unit (AR)", "الوحدة (عربي)")[lang]}><input className="input" dir="rtl" value={unitAr} onChange={(e) => setUnitAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("File Type", "نوع الملف")[lang]}>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as FileType)}>
            <option value="pdf">PDF</option><option value="ppt">PowerPoint</option><option value="worksheet">Worksheet</option><option value="image">Image</option>
          </select>
        </Field>
        <Field label={L("Subject Category", "التصنيف")[lang]}>
          <select className="input" value={subjectCategory} onChange={(e) => setSubjectCategory(e.target.value as SubjectCategory)}>
            {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{bi(c.name)}</option>)}
          </select>
        </Field>
      </Row>
      <Field label={L("Upload File", "ارفع الملف")[lang]} required>
        <input type="file" onChange={onFile} className="input" />
        {file && <div className="text-xs text-primary mt-1">✓ {file.name} ({file.size})</div>}
      </Field>
      <PublishActions pub={pub} setPub={setPub} onSave={submit} lang={lang} />
    </FormCard>
  );
}

// ============ Manage Lists ============
function ItemRow({
  children, onPublish, onDelete, published, viewHref, lessonDelete,
}: {
  children: React.ReactNode;
  onPublish: () => void;
  onDelete: () => void;
  published: boolean;
  viewHref?: string;
  lessonDelete?: CustomLesson;
}) {
  const { lang, bi, biMaybe } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex-1 min-w-0">{children}</div>
      {viewHref && (
        <Link to={viewHref} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></Link>
      )}
      <button onClick={onPublish} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${published ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
        {published ? <><Eye className="h-3.5 w-3.5" /> Published</> : <><EyeOff className="h-3.5 w-3.5" /> Draft</>}
      </button>
      {lessonDelete ? (
        <DeleteLessonButton
          lesson={lessonDelete}
          lang={lang}
          iconOnly
          className="inline-flex items-center justify-center rounded-full border border-destructive/40 text-destructive p-1.5 hover:bg-destructive/10"
        />
      ) : (
        <button onClick={onDelete} className="inline-flex items-center justify-center rounded-full border border-destructive/40 text-destructive p-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
      )}
    </div>
  );
}

function ManageResources() {
  const { lang, bi, biMaybe } = useI18n();
  const { files, updateFile, deleteFile, lessons, updateLesson } = useCMS();
  return (
    <div className="space-y-6">
      <SectionCard title={L("Uploaded Files", "الملفات المرفوعة")[lang]}>
        {files.length === 0 ? <Empty lang={lang} /> : files.map((f: CustomFile) => (
          <ItemRow key={f.id} published={f.published}
            onPublish={() => updateFile(f.id, { published: !f.published })}
            onDelete={() => { deleteFile(f.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}>
            <div className="font-medium text-foreground truncate">{bi(f.title)}</div>
            <div className="text-xs text-muted-foreground">{f.type.toUpperCase()} · {f.size} · {f.fileName}</div>
          </ItemRow>
        ))}
      </SectionCard>
      <SectionCard title={L("Custom Lessons", "الدروس المخصصة")[lang]}>
        {lessons.length === 0 ? <Empty lang={lang} /> : lessons.map((l: CustomLesson) => (
          <ItemRow key={l.id} published={l.published}
            onPublish={() => updateLesson(l.id, { published: !l.published })}
            onDelete={() => {}}
            lessonDelete={l}
            viewHref={`/grades/${l.grade}/${l.id}`}>
            <div className="font-medium text-foreground truncate">{bi(l.title)}</div>
            <div className="text-xs text-muted-foreground">{L("Grade", "الصف")[lang]}: {biMaybe(grades.find(g => g.slug === l.grade)?.name) || l.grade}</div>
          </ItemRow>
        ))}
      </SectionCard>
    </div>
  );
}

function ManageGrades() {
  const { lang, bi, biMaybe } = useI18n();
  const { lessons } = useCMS();
  return (
    <SectionCard title={L("Grades", "الصفوف")[lang]}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-start py-3 pe-4">{L("Grade", "الصف")[lang]}</th>
              <th className="text-start py-3 pe-4">{L("Stage", "المرحلة")[lang]}</th>
              <th className="text-start py-3 pe-4">{L("Built-in lessons", "دروس مدمجة")[lang]}</th>
              <th className="text-start py-3 pe-4">{L("Custom lessons", "دروس مخصصة")[lang]}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g) => (
              <tr key={g.slug} className="border-b border-border/60 last:border-0">
                <td className="py-3 pe-4 font-medium">{bi(g.name)}</td>
                <td className="py-3 pe-4 text-muted-foreground">{bi(g.stage)}</td>
                <td className="py-3 pe-4">{g.lessons.length}</td>
                <td className="py-3 pe-4">{lessons.filter(l => l.grade === g.slug).length}</td>
                <td className="py-3 pe-4 text-end">
                  <Link to="/grades/$grade" params={{ grade: g.slug }} className="text-xs text-primary hover:text-primary inline-flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function ManageUnits() {
  const { lang, bi, biMaybe } = useI18n();
  const { lessons } = useCMS();
  const units = new Map<string, number>();
  grades.forEach(g => g.lessons.forEach(l => units.set(`${bi(g.name)} — ${bi(l.unit)}`, (units.get(`${bi(g.name)} — ${bi(l.unit)}`) ?? 0) + 1)));
  lessons.forEach(l => {
    const gn = biMaybe(grades.find(g => g.slug === l.grade)?.name) || l.grade;
    const k = `${gn} — ${bi(l.unit) || "—"}`;
    units.set(k, (units.get(k) ?? 0) + 1);
  });
  return (
    <SectionCard title={L("Units", "الوحدات")[lang]}>
      {units.size === 0 ? <Empty lang={lang} /> : (
        <div className="space-y-2">
          {[...units.entries()].map(([k, n]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <span>{k}</span><span className="text-xs text-muted-foreground">{n} {L("lessons", "درس")[lang]}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ManageQuizzes() {
  const { lang, bi, biMaybe } = useI18n();
  const { lessons, updateLesson } = useCMS();
  return (
    <SectionCard title={L("Custom Lesson Quizzes", "اختبارات الدروس المخصصة")[lang]}>
      {lessons.length === 0 ? <Empty lang={lang} /> : lessons.map((l) => (
        <ItemRow key={l.id} published={l.published}
          onPublish={() => updateLesson(l.id, { published: !l.published })}
          onDelete={() => {}}
          lessonDelete={l}
          viewHref={`/grades/${l.grade}/${l.id}`}>
          <div className="font-medium text-foreground truncate">{bi(l.title)}</div>
          <div className="text-xs text-muted-foreground">{l.quiz.length} {L("questions", "أسئلة")[lang]} · {biMaybe(grades.find(g => g.slug === l.grade)?.name) || l.grade}</div>
        </ItemRow>
      ))}
    </SectionCard>
  );
}

function ManageAnnouncements() {
  const { lang, bi, biMaybe } = useI18n();
  const { articles, updateArticle, deleteArticle, videos: cvids, updateVideo, deleteVideo } = useCMS();
  return (
    <div className="space-y-6">
      <SectionCard title={L("Articles", "المقالات")[lang]}>
        {articles.length === 0 ? <Empty lang={lang} /> : articles.map((a: CustomArticle) => (
          <ItemRow key={a.id} published={a.published}
            onPublish={() => updateArticle(a.id, { published: !a.published })}
            onDelete={() => { deleteArticle(a.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}
            viewHref={a.category === "announcement" ? `/announcements/${a.id}` : `/parent/${a.id}`}>
            <div className="font-medium text-foreground truncate">{bi(a.title)}</div>
            <div className="text-xs text-muted-foreground">{a.category === "announcement" ? L("Announcement", "إعلان")[lang] : L("Parent Corner", "ركن الوالدين")[lang]}</div>
          </ItemRow>
        ))}
      </SectionCard>
      <SectionCard title={L("Videos", "الفيديوهات")[lang]}>
        {cvids.length === 0 ? <Empty lang={lang} /> : cvids.map((v: CustomVideo) => (
          <ItemRow key={v.id} published={v.published}
            onPublish={() => updateVideo(v.id, { published: !v.published })}
            onDelete={() => { deleteVideo(v.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}
            viewHref={`/videos/${v.id}`}>
            <div className="font-medium text-foreground truncate">{bi(v.title)}</div>
            <div className="text-xs text-muted-foreground">{v.grade}</div>
          </ItemRow>
        ))}
      </SectionCard>
    </div>
  );
}

// ============ Shared building blocks ============
function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] space-y-5">
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      {children}
      <style>{`.input{display:block;width:100%;border-radius:.5rem;border:1px solid var(--border);background:var(--background);padding:.55rem .75rem;font-size:.875rem;color:var(--foreground);}.input:focus{outline:none;border-color:var(--primary)}`}</style>
    </div>
  );
}
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-xl text-foreground mb-4">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}{required && <span className="text-destructive ms-1">*</span>}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
function PublishActions({ pub, setPub, onSave, lang }: { pub: boolean; setPub: (b: boolean) => void; onSave: () => void; lang: "en" | "ar" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-primary h-4 w-4" />
        {L("Publish now (otherwise save as draft)", "النشر الآن (وإلا حفظ كمسودة)")[lang]}
      </label>
      <button onClick={onSave} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)]">
        <Save className="h-4 w-4" /> {pub ? L("Publish", "نشر")[lang] : L("Save Draft", "حفظ كمسودة")[lang]}
      </button>
    </div>
  );
}
function Empty({ lang }: { lang: "en" | "ar" }) {
  return <div className="text-sm text-muted-foreground py-6 text-center">{L("No items yet.", "لا توجد عناصر بعد.")[lang]}</div>;
}

function ManageUsers() {
  const { lang, bi, biMaybe } = useI18n();
  const [profiles, setProfiles] = useState<Array<{
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    grade: string;
    section: string | null;
    islamic_group: string | null;
    parent_link_code: string | null;
    profile_photo_path: string | null;
  }>>([]);
  const [roles, setRoles] = useState<Array<{ user_id: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, email, grade, section, islamic_group, parent_link_code, profile_photo_path").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      setProfiles(p.data ?? []);
      setRoles(r.data ?? []);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const isAdmin = (userId: string) => roles.some((x) => x.user_id === userId && x.role === "admin");

  const grantAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) throw error;
      toast.success(L("Admin role granted", "تم منح صلاحية المدير")[lang]);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const revokeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) throw error;
      toast.success(L("Admin role revoked", "تم إلغاء صلاحية المدير")[lang]);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const promoteByEmail = async () => {
    const profile = profiles.find((p) => p.email.toLowerCase() === promoteEmail.trim().toLowerCase());
    if (!profile) {
      toast.error(L("User not found", "المستخدم غير موجود")[lang]);
      return;
    }
    await grantAdmin(profile.user_id);
    setPromoteEmail("");
  };

  const regenerateCode = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("admin_regenerate_parent_link_code", {
        p_student_user_id: userId,
      });
      if (error) throw error;
      const payload = (data ?? {}) as { ok?: boolean; parent_link_code?: string; error?: string };
      if (!payload.ok) throw new Error(payload.error ?? "unknown");
      toast.success(L("Link code regenerated", "تم تجديد رمز الربط")[lang]);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title={L("Grant Admin Access", "منح صلاحية المدير")[lang]}>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder={L("User email", "البريد الإلكتروني")[lang]}
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
          />
          <button onClick={() => void promoteByEmail()} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
            {L("Grant Admin", "منح المدير")[lang]}
          </button>
        </div>
      </SectionCard>
      <SectionCard title={L("Registered Users", "المستخدمون المسجلون")[lang]}>
        {loading ? (
          <div className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</div>
        ) : profiles.length === 0 ? (
          <Empty lang={lang} />
        ) : (
          profiles.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
              <StudentProfileAvatar
                profilePhotoPath={p.profile_photo_path}
                alt={p.full_name || p.email}
                className="h-11 w-11"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.full_name || p.email}</div>
                <div className="text-xs text-muted-foreground">
                  {p.email} · {L("Grade", "الصف")[lang]}: {p.grade || "—"}
                  {(p.section || p.islamic_group) ? (
                    <span>
                      {" · "}
                      {formatStudentAcademics(
                        {
                          section: normalizeStudentSection(p.section),
                          islamic_group: normalizeIslamicGroup(p.islamic_group),
                        },
                        lang,
                      )}
                    </span>
                  ) : null}
                  {p.parent_link_code ? (
                    <span className="ms-2 font-mono text-primary"> · {p.parent_link_code}</span>
                  ) : null}
                </div>
              </div>
              <span className="text-xs rounded-full border border-border px-2 py-1">
                {isAdmin(p.user_id) ? "Admin" : "Student"}
              </span>
              {!isAdmin(p.user_id) && (
                <button
                  type="button"
                  onClick={() => void regenerateCode(p.user_id)}
                  className="text-xs text-primary hover:underline"
                >
                  {L("Regenerate code", "تجديد الرمز")[lang]}
                </button>
              )}
              {isAdmin(p.user_id) ? (
                <button onClick={() => void revokeAdmin(p.user_id)} className="text-xs text-destructive hover:underline">
                  {L("Revoke Admin", "إلغاء المدير")[lang]}
                </button>
              ) : (
                <button onClick={() => void grantAdmin(p.user_id)} className="text-xs text-primary hover:underline">
                  {L("Make Admin", "تعيين مدير")[lang]}
                </button>
              )}
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}

function ManageParentLinks() {
  const { lang, bi, biMaybe } = useI18n();
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<Array<{ user_id: string; full_name: string; email: string }>>([]);
  const [students, setStudents] = useState<Array<{
    user_id: string;
    full_name: string;
    email: string;
    grade: string;
    section: string | null;
    islamic_group: string | null;
  }>>([]);
  const [links, setLinks] = useState<Array<{ id: string; parent_user_id: string; student_user_id: string }>>([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [parentProfilesRes, profilesRes, linksRes, rolesRes] = await Promise.all([
        supabase.from("parent_profiles").select("user_id, full_name, email").order("full_name"),
        supabase.from("profiles").select("user_id, full_name, email, grade, section, islamic_group").order("full_name"),
        supabase.from("parent_student_links").select("id, parent_user_id, student_user_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (parentProfilesRes.error) throw parentProfilesRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (linksRes.error) throw linksRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const parentIds = new Set(
        (rolesRes.data ?? []).filter((row) => row.role === "parent").map((row) => row.user_id),
      );
      const parentRows = (parentProfilesRes.data ?? []).filter((row) => parentIds.has(row.user_id));
      const adminIds = new Set(
        (rolesRes.data ?? []).filter((row) => row.role === "admin").map((row) => row.user_id),
      );
      const studentRows = (profilesRes.data ?? []).filter((row) => !adminIds.has(row.user_id));

      setParents(parentRows);
      setStudents(studentRows);
      setLinks(linksRes.data ?? []);
      if (!selectedParentId && parentRows[0]) setSelectedParentId(parentRows[0].user_id);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const parentById = new Map(parents.map((parent) => [parent.user_id, parent]));
  const studentById = new Map(students.map((student) => [student.user_id, student]));
  const linksForParent = links.filter((link) => link.parent_user_id === selectedParentId);

  const addLink = async () => {
    if (!selectedParentId || !selectedStudentId) {
      toast.error(L("Select a parent and a student.", "اختر ولي أمر وطالبًا.")[lang]);
      return;
    }
    if (links.some((link) => link.parent_user_id === selectedParentId && link.student_user_id === selectedStudentId)) {
      toast.error(L("This link already exists.", "هذا الربط موجود بالفعل.")[lang]);
      return;
    }
    try {
      const { error } = await supabase.from("parent_student_links").insert({
        parent_user_id: selectedParentId,
        student_user_id: selectedStudentId,
      });
      if (error) throw error;
      toast.success(L("Student linked to parent.", "تم ربط الطالب بولي الأمر.")[lang]);
      setSelectedStudentId("");
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const removeLink = async (linkId: string) => {
    try {
      const { error } = await supabase.from("parent_student_links").delete().eq("id", linkId);
      if (error) throw error;
      toast.success(L("Link removed.", "تم إزالة الربط.")[lang]);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title={L("Link student to parent", "ربط طالب بولي أمر")[lang]}>
        {loading ? (
          <div className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</div>
        ) : parents.length === 0 ? (
          <Empty lang={lang} />
        ) : (
          <div className="space-y-4">
            <Row>
              <Field label={L("Parent account", "حساب ولي الأمر")[lang]} required>
                <select
                  className="input w-full"
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                >
                  {parents.map((parent) => (
                    <option key={parent.user_id} value={parent.user_id}>
                      {parent.full_name || parent.email} ({parent.email})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={L("Student", "الطالب")[lang]} required>
                <select
                  className="input w-full"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">{L("Select student…", "اختر طالبًا…")[lang]}</option>
                  {students.map((student) => (
                    <option key={student.user_id} value={student.user_id}>
                      {student.full_name || student.email} · {L("Grade", "الصف")[lang]} {student.grade || "—"}
                      {(student.section || student.islamic_group)
                        ? ` · ${formatStudentAcademics(
                            {
                              section: normalizeStudentSection(student.section),
                              islamic_group: normalizeIslamicGroup(student.islamic_group),
                            },
                            lang,
                          )}`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </Row>
            <button
              type="button"
              onClick={() => void addLink()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {L("Add link", "إضافة ربط")[lang]}
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title={L("Linked children", "الأبناء المرتبطون")[lang]}>
        {loading ? (
          <div className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</div>
        ) : !selectedParentId ? (
          <Empty lang={lang} />
        ) : linksForParent.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {L("No linked students for this parent yet.", "لا يوجد طلاب مرتبطون بهذا ولي الأمر بعد.")[lang]}
          </p>
        ) : (
          linksForParent.map((link) => {
            const student = studentById.get(link.student_user_id);
            const parent = parentById.get(link.parent_user_id);
            return (
              <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{student?.full_name || student?.email || link.student_user_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {parent?.full_name || parent?.email || link.parent_user_id}
                    {student?.grade ? ` · ${L("Grade", "الصف")[lang]}: ${student.grade}` : ""}
                    {(student?.section || student?.islamic_group) ? (
                      <span>
                        {" · "}
                        {formatStudentAcademics(
                          {
                            section: normalizeStudentSection(student.section),
                            islamic_group: normalizeIslamicGroup(student.islamic_group),
                          },
                          lang,
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void removeLink(link.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  {L("Remove link", "إزالة الربط")[lang]}
                </button>
              </div>
            );
          })
        )}
      </SectionCard>
    </div>
  );
}

// suppress unused
void X;
