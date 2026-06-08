import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson, type CustomVideo, type CustomFile, type CustomArticle, type FileType, type ArticleCategory } from "@/lib/cms";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/categories";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import type { QuizQuestion } from "@/lib/curriculum";
import {
  BookOpen, Video, FileUp, Newspaper, Folder, GraduationCap,
  Layers, ClipboardCheck, Megaphone, Plus, Trash2, Eye, EyeOff, Save, X, ExternalLink, LogOut, Pencil, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { uploadToStorage, formatError } from "@/lib/upload";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminSidebar, type AdminTab } from "@/components/admin-sidebar";
import { DeleteLessonButton } from "@/components/admin-manage-lessons";
import { LessonBilingualFileFields } from "@/components/lesson-bilingual-file-fields";
import {
  bilingualFilesFromLesson,
  bilingualFilesSavePayload,
  bilingualFilesToLessonUpdate,
  mergeBilingualFiles,
  EMPTY_BILINGUAL_LESSON_FILES,
  type BilingualLessonFiles,
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

const L = (en: string, ar: string) => ({ en, ar });

function parseAdminTab(search: Record<string, unknown>): Tab | undefined {
  return typeof search.tab === "string" ? (search.tab as Tab) : undefined;
}

export function AdminLayoutShell({ email }: { email: string }) {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const tab = parseAdminTab(search) ?? "overview";
  const onLessonsList = pathname === "/admin/lessons" || pathname === "/admin/lessons/";
  const onLessonsEdit = pathname.startsWith("/admin/lessons/edit/");

  const adminLabel = L("Admin", "الإدارة")[lang];
  const manageLessonsLabel = L("Manage Lessons", "إدارة الدروس")[lang];
  const title = onLessonsList
    ? manageLessonsLabel
    : onLessonsEdit
      ? L("Edit Lesson", "تعديل الدرس")[lang]
      : L("Admin Dashboard", "لوحة الإدارة")[lang];
  const lead = onLessonsList
    ? L("View and edit all lessons.", "عرض وتعديل جميع الدروس.")[lang]
    : onLessonsEdit
      ? L("Update the existing lesson.", "تحديث بيانات الدرس الحالي.")[lang]
      : L("Create, edit, publish, and manage all content via Supabase CMS.",
          "أنشئ المحتوى وحرّره وانشره وأدره عبر نظام إدارة المحتوى.")[lang];
  const crumbs = onLessonsList
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
    </>
  );
}

function DebugPanel() {
  const { debug, refresh, lessons, videos, files, articles } = useCMS();
  const dotClass = debug.lastStatus === "error" ? "bg-red-500" : debug.lastStatus === "success" ? "bg-emerald" : "bg-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <div className="font-sans text-sm font-semibold">CMS Debug</div>
        <button onClick={() => void refresh()} className="px-2 py-1 rounded border border-border hover:bg-muted text-[11px]">Refetch</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
        <div>Supabase connected: <span className={debug.connected ? "text-emerald" : "text-red-500"}>{debug.connected ? "yes" : "no"}</span></div>
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
  const { lang } = useI18n();
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
            <div className="font-display text-3xl text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Lesson Form ============
const emptyQuiz: QuizQuestion = { q: { en: "", ar: "" }, options: [{ en: "", ar: "" }, { en: "", ar: "" }, { en: "", ar: "" }, { en: "", ar: "" }], answer: 0 };

function lessonToFormState(l: CustomLesson) {
  return {
    grade: l.grade,
    unitEn: l.unit.en, unitAr: l.unit.ar,
    titleEn: l.title.en, titleAr: l.title.ar,
    outEn: l.outcome.en, outAr: l.outcome.ar,
    expEn: l.explanation.en, expAr: l.explanation.ar,
    vocEn: l.vocab.en, vocAr: l.vocab.ar,
    actEn: l.activity.en, actAr: l.activity.ar,
    wsEn: l.worksheetText.en, wsAr: l.worksheetText.ar,
    subjectCategory: l.subjectCategory,
    yt: l.youtubeUrl,
    pdf: l.pdfUrl ? { url: l.pdfUrl, name: l.pdfName ?? "PDF" } : null,
    ppt: l.pptUrl ? { url: l.pptUrl, name: l.pptName ?? "PowerPoint" } : null,
    ws: l.worksheetUrl ? { url: l.worksheetUrl, name: l.worksheetName ?? "Worksheet" } : null,
    bilingualFiles: bilingualFilesFromLesson(l),
    quiz: l.quiz.length > 0
      ? l.quiz.map((q) => ({ ...q, q: { ...q.q }, options: q.options.map((o) => ({ ...o })) }))
      : [{ ...emptyQuiz, options: emptyQuiz.options.map((o) => ({ ...o })) }],
    pub: l.published,
  };
}

function LessonForm({ editId, onSaved, onCancel }: { editId?: string | null; onSaved?: () => void; onCancel?: () => void }) {
  const isEditing = !!editId;
  const { lang } = useI18n();
  const { refresh, lessons, updateLesson } = useCMS();
  const navigate = useNavigate();
  const [grade, setGrade] = useState(grades[0]?.slug ?? "");
  const [unitEn, setUnitEn] = useState(""); const [unitAr, setUnitAr] = useState("");
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [outEn, setOutEn] = useState(""); const [outAr, setOutAr] = useState("");
  const [expEn, setExpEn] = useState(""); const [expAr, setExpAr] = useState("");
  const [vocEn, setVocEn] = useState(""); const [vocAr, setVocAr] = useState("");
  const [actEn, setActEn] = useState(""); const [actAr, setActAr] = useState("");
  const [wsEn, setWsEn] = useState(""); const [wsAr, setWsAr] = useState("");
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>("quran");
  const [yt, setYt] = useState("");
  const [pdf, setPdf] = useState<{ url: string; name: string } | null>(null);
  const [ppt, setPpt] = useState<{ url: string; name: string } | null>(null);
  const [ws, setWs] = useState<{ url: string; name: string } | null>(null);
  const [bilingualFiles, setBilingualFiles] = useState<BilingualLessonFiles>(EMPTY_BILINGUAL_LESSON_FILES);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([{ ...emptyQuiz }]);
  const [pub, setPub] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbg, setDbg] = useState({ clicked: false, valid: false, status: "" as "" | "success" | "error", error: "", id: "" });
  const bilingualLoadedFor = useRef<string | null>(null);

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
    setActEn(s.actEn); setActAr(s.actAr);
    setWsEn(s.wsEn); setWsAr(s.wsAr);
    setSubjectCategory(s.subjectCategory);
    setYt(s.yt);
    setPdf(s.pdf); setPpt(s.ppt); setWs(s.ws);
    setQuiz(s.quiz);
    setPub(s.pub);
  }, [editId, lessons]);

  useEffect(() => {
    if (!editId) {
      setBilingualFiles(EMPTY_BILINGUAL_LESSON_FILES);
      bilingualLoadedFor.current = null;
      return;
    }
    if (bilingualLoadedFor.current !== editId) {
      bilingualLoadedFor.current = null;
    }
    const lesson = lessons.find((l) => l.id === editId);
    if (!lesson) return;
    if (bilingualLoadedFor.current === editId) return;
    bilingualLoadedFor.current = editId;
    setBilingualFiles(lessonToFormState(lesson).bilingualFiles);
  }, [editId, lessons]);

  const onFile = (setter: (v: { url: string; name: string } | null) => void, folder: string) => async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      toast.message(L("Uploading file…", "جارٍ رفع الملف…")[lang]);
      const up = await uploadToStorage(f, folder);
      setter({ url: up.url, name: up.name });
      toast.success(L("File uploaded", "تم رفع الملف")[lang]);
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  const resetForm = () => {
    setTitleEn(""); setTitleAr(""); setOutEn(""); setOutAr(""); setExpEn(""); setExpAr("");
    setVocEn(""); setVocAr(""); setActEn(""); setActAr(""); setWsEn(""); setWsAr(""); setYt("");
    setPdf(null); setPpt(null); setWs(null); setBilingualFiles(EMPTY_BILINGUAL_LESSON_FILES); setQuiz([{ ...emptyQuiz }]);
    setUnitEn(""); setUnitAr("");
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

    const payload = {
      grade: normalizeGradeSlug(grade),
      unit: { en: unitEn, ar: unitAr },
      title: { en: titleEn, ar: titleAr },
      outcome: { en: outEn, ar: outAr },
      explanation: { en: expEn, ar: expAr },
      vocab: { en: vocEn, ar: vocAr },
      activity: { en: actEn, ar: actAr },
      worksheet_text: { en: wsEn, ar: wsAr },
      subject_category: subjectCategory,
      youtube_url: yt,
      pdf_url: pdf?.url ?? null,
      pdf_name: pdf?.name ?? null,
      ppt_url: ppt?.url ?? null,
      ppt_name: ppt?.name ?? null,
      worksheet_url: ws?.url ?? null,
      worksheet_name: ws?.name ?? null,
      ppt_ar_url: bilingualFiles.pptArUrl,
      ppt_en_url: bilingualFiles.pptEnUrl,
      worksheet_ar_url: bilingualFiles.worksheetArUrl,
      worksheet_en_url: bilingualFiles.worksheetEnUrl,
      pdf_ar_url: bilingualFiles.pdfArUrl,
      pdf_en_url: bilingualFiles.pdfEnUrl,
      quiz: quiz.filter((q) => q.q.en || q.q.ar),
      published: publish,
    };

    // Safety: never let base64 data URLs reach the DB (causes statement timeout).
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "string" && v.startsWith("data:")) {
        const msg = `Field ${k} contains an embedded file. Re-upload the file before saving.`;
        toast.error(msg);
        setDbg({ clicked: true, valid: true, status: "error", error: msg, id: "" });
        setSaving(false);
        return;
      }
    }

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
          activity: payload.activity,
          worksheetText: payload.worksheet_text,
          subjectCategory: payload.subject_category,
          youtubeUrl: payload.youtube_url,
          pdfUrl: payload.pdf_url ?? undefined,
          pdfName: payload.pdf_name ?? undefined,
          pptUrl: payload.ppt_url ?? undefined,
          pptName: payload.ppt_name ?? undefined,
          worksheetUrl: payload.worksheet_url ?? undefined,
          worksheetName: payload.worksheet_name ?? undefined,
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

      console.log("[LessonForm] table=lessons payload=", payload);
      const { data, error } = await supabase
        .from("lessons")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(payload as any)
        .select()
        .single();
      if (error) {
        console.error("[LessonForm] supabase error", {
          message: error.message, code: error.code, details: error.details, hint: error.hint,
        });
        throw error;
      }
      const id = (data as { id: string }).id;
      console.log("[LessonForm] insert ok", id);
      setDbg({ clicked: true, valid: true, status: "success", error: "", id });
      toast.success(publish
        ? L("Lesson published!", "تم نشر الدرس!")[lang]
        : L("Saved as draft", "حُفظ كمسودة")[lang]);
      await refresh();
      resetForm();
      if (publish) {
        navigate({ to: "/grades/$grade", params: { grade } });
      }
    } catch (e) {
      const msg = formatError(e);
      setDbg({ clicked: true, valid: true, status: "error", error: msg, id: editId ?? "" });
      if (!isEditing) toast.error(`Save failed: ${msg}`);
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

  return (
    <FormCard title={isEditing ? L("Edit Lesson", "تعديل الدرس")[lang] : L("Add New Lesson", "إضافة درس جديد")[lang]}>
      <Row>
        <Field label={L("Grade", "الصف")[lang]}>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input">
            {grades.map((g) => <option key={g.slug} value={g.slug}>{g.name[lang]}</option>)}
          </select>
        </Field>
        <Field label={L("Subject Category", "التصنيف")[lang]}>
          <select value={subjectCategory} onChange={(e) => setSubjectCategory(e.target.value as SubjectCategory)} className="input">
            {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name[lang]}</option>)}
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
        <Field label={L("Student Activity (EN)", "نشاط الطالب (إنجليزي)")[lang]}><textarea className="input" rows={3} value={actEn} onChange={(e) => setActEn(e.target.value)} /></Field>
        <Field label={L("Student Activity (AR)", "نشاط الطالب (عربي)")[lang]}><textarea className="input" dir="rtl" rows={3} value={actAr} onChange={(e) => setActAr(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={L("Worksheet Text (EN)", "نص ورقة العمل (إنجليزي)")[lang]}><textarea className="input" rows={3} value={wsEn} onChange={(e) => setWsEn(e.target.value)} /></Field>
        <Field label={L("Worksheet Text (AR)", "نص ورقة العمل (عربي)")[lang]}><textarea className="input" dir="rtl" rows={3} value={wsAr} onChange={(e) => setWsAr(e.target.value)} /></Field>
      </Row>
      <Field label={L("YouTube Video Link", "رابط فيديو يوتيوب")[lang]}>
        <input className="input" placeholder="https://www.youtube.com/watch?v=..." value={yt} onChange={(e) => setYt(e.target.value)} />
      </Field>
      <Row>
        <Field label={L("PDF Upload", "ملف PDF")[lang]}>
          <input type="file" accept=".pdf" onChange={onFile(setPdf, "lessons/pdf")} className="input" />
          {pdf && <div className="text-xs text-emerald mt-1">✓ {pdf.name}</div>}
        </Field>
        <Field label={L("PowerPoint Upload", "ملف PowerPoint")[lang]}>
          <input type="file" accept=".ppt,.pptx" onChange={onFile(setPpt, "lessons/ppt")} className="input" />
          {ppt && <div className="text-xs text-emerald mt-1">✓ {ppt.name}</div>}
        </Field>
      </Row>
      <Field label={L("Worksheet Upload", "ورقة العمل")[lang]}>
        <input type="file" onChange={onFile(setWs, "lessons/worksheet")} className="input" />
        {ws && <div className="text-xs text-emerald mt-1">✓ {ws.name}</div>}
      </Field>

      <LessonBilingualFileFields
        files={bilingualFiles}
        onChange={setBilingualFiles}
        lessonId={editId ?? undefined}
        savedFiles={editLesson ? bilingualFilesFromLesson(editLesson) : undefined}
      />

      <div className="rounded-xl border border-border bg-background p-4 mt-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-lg text-primary">{L("Quiz Questions", "أسئلة الاختبار")[lang]}</h4>
          <button type="button" onClick={() => setQuiz((q) => [...q, { ...emptyQuiz, options: emptyQuiz.options.map(o => ({ ...o })) }])}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-emerald hover:text-emerald">
            <Plus className="h-3.5 w-3.5" /> {L("Add Question", "إضافة سؤال")[lang]}
          </button>
        </div>
        <div className="space-y-4">
          {quiz.map((q, i) => (
            <div key={i} className="rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-emerald font-semibold">Q{i + 1}</div>
                <button type="button" onClick={() => setQuiz((qq) => qq.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/70"><Trash2 className="h-4 w-4" /></button>
              </div>
              <Row>
                <input className="input" placeholder="Question (EN)" value={q.q.en} onChange={(e) => setQuiz((qq) => qq.map((x, j) => j === i ? { ...x, q: { ...x.q, en: e.target.value } } : x))} />
                <input className="input" dir="rtl" placeholder="السؤال (عربي)" value={q.q.ar} onChange={(e) => setQuiz((qq) => qq.map((x, j) => j === i ? { ...x, q: { ...x.q, ar: e.target.value } } : x))} />
              </Row>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2 mt-2">
                  <input type="radio" name={`ans-${i}`} checked={q.answer === oi} onChange={() => setQuiz((qq) => qq.map((x, j) => j === i ? { ...x, answer: oi } : x))} className="accent-emerald" />
                  <input className="input flex-1" placeholder={`Option ${oi + 1} (EN)`} value={opt.en} onChange={(e) => setQuiz((qq) => qq.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, en: e.target.value } : o) } : x))} />
                  <input className="input flex-1" dir="rtl" placeholder={`خيار ${oi + 1}`} value={opt.ar} onChange={(e) => setQuiz((qq) => qq.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, ar: e.target.value } : o) } : x))} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-emerald h-4 w-4" />
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
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
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
        <div>Button clicked: <span className={dbg.clicked ? "text-emerald" : ""}>{dbg.clicked ? "yes" : "no"}</span></div>
        <div>Form valid: <span className={dbg.valid ? "text-emerald" : "text-destructive"}>{dbg.clicked ? (dbg.valid ? "yes" : "no") : "—"}</span></div>
        <div>Supabase {isEditing ? "update" : "insert"}: <span className={dbg.status === "success" ? "text-emerald" : dbg.status === "error" ? "text-destructive" : ""}>{dbg.status || "—"}</span></div>
        <div className="break-all">Last error: <span className="text-destructive">{dbg.error || "—"}</span></div>
        <div className="break-all">Last {isEditing ? "updated" : "inserted"} ID: <span className="text-emerald">{dbg.id || "—"}</span></div>
      </div>
    </FormCard>
  );
}

// ============ Article Form ============
function ArticleForm() {
  const { lang } = useI18n();
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
            {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name[lang]}</option>)}
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
  const { lang } = useI18n();
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
          {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name[lang]}</option>)}
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
            {grades.map((g) => <option key={g.slug} value={g.slug}>{g.name[lang]}</option>)}
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
  const { lang } = useI18n();
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
    .map((l) => ({ slug: l.id, title: l.title[lang] }));

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
            {grades.map((g) => <option key={g.slug} value={g.slug}>{g.name[lang]}</option>)}
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
            {SUBJECT_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name[lang]}</option>)}
          </select>
        </Field>
      </Row>
      <Field label={L("Upload File", "ارفع الملف")[lang]} required>
        <input type="file" onChange={onFile} className="input" />
        {file && <div className="text-xs text-emerald mt-1">✓ {file.name} ({file.size})</div>}
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
  const { lang } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex-1 min-w-0">{children}</div>
      {viewHref && (
        <Link to={viewHref} className="inline-flex items-center gap-1 text-xs text-primary hover:text-emerald"><ExternalLink className="h-3.5 w-3.5" /></Link>
      )}
      <button onClick={onPublish} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${published ? "border-emerald text-emerald" : "border-border text-muted-foreground"}`}>
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
  const { lang } = useI18n();
  const { files, updateFile, deleteFile, lessons, updateLesson } = useCMS();
  return (
    <div className="space-y-6">
      <SectionCard title={L("Uploaded Files", "الملفات المرفوعة")[lang]}>
        {files.length === 0 ? <Empty lang={lang} /> : files.map((f: CustomFile) => (
          <ItemRow key={f.id} published={f.published}
            onPublish={() => updateFile(f.id, { published: !f.published })}
            onDelete={() => { deleteFile(f.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}>
            <div className="font-medium text-foreground truncate">{f.title[lang]}</div>
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
            <div className="font-medium text-foreground truncate">{l.title[lang]}</div>
            <div className="text-xs text-muted-foreground">{L("Grade", "الصف")[lang]}: {grades.find(g => g.slug === l.grade)?.name[lang]}</div>
          </ItemRow>
        ))}
      </SectionCard>
    </div>
  );
}

function ManageGrades() {
  const { lang } = useI18n();
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
                <td className="py-3 pe-4 font-medium">{g.name[lang]}</td>
                <td className="py-3 pe-4 text-muted-foreground">{g.stage[lang]}</td>
                <td className="py-3 pe-4">{g.lessons.length}</td>
                <td className="py-3 pe-4">{lessons.filter(l => l.grade === g.slug).length}</td>
                <td className="py-3 pe-4 text-end">
                  <Link to="/grades/$grade" params={{ grade: g.slug }} className="text-xs text-primary hover:text-emerald inline-flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> View</Link>
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
  const { lang } = useI18n();
  const { lessons } = useCMS();
  const units = new Map<string, number>();
  grades.forEach(g => g.lessons.forEach(l => units.set(`${g.name[lang]} — ${l.unit[lang]}`, (units.get(`${g.name[lang]} — ${l.unit[lang]}`) ?? 0) + 1)));
  lessons.forEach(l => {
    const gn = grades.find(g => g.slug === l.grade)?.name[lang] ?? l.grade;
    const k = `${gn} — ${l.unit[lang] || "—"}`;
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
  const { lang } = useI18n();
  const { lessons, updateLesson } = useCMS();
  return (
    <SectionCard title={L("Custom Lesson Quizzes", "اختبارات الدروس المخصصة")[lang]}>
      {lessons.length === 0 ? <Empty lang={lang} /> : lessons.map((l) => (
        <ItemRow key={l.id} published={l.published}
          onPublish={() => updateLesson(l.id, { published: !l.published })}
          onDelete={() => {}}
          lessonDelete={l}
          viewHref={`/grades/${l.grade}/${l.id}`}>
          <div className="font-medium text-foreground truncate">{l.title[lang]}</div>
          <div className="text-xs text-muted-foreground">{l.quiz.length} {L("questions", "أسئلة")[lang]} · {grades.find(g => g.slug === l.grade)?.name[lang]}</div>
        </ItemRow>
      ))}
    </SectionCard>
  );
}

function ManageAnnouncements() {
  const { lang } = useI18n();
  const { articles, updateArticle, deleteArticle, videos: cvids, updateVideo, deleteVideo } = useCMS();
  return (
    <div className="space-y-6">
      <SectionCard title={L("Articles", "المقالات")[lang]}>
        {articles.length === 0 ? <Empty lang={lang} /> : articles.map((a: CustomArticle) => (
          <ItemRow key={a.id} published={a.published}
            onPublish={() => updateArticle(a.id, { published: !a.published })}
            onDelete={() => { deleteArticle(a.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}
            viewHref={a.category === "announcement" ? `/announcements/${a.id}` : `/parent/${a.id}`}>
            <div className="font-medium text-foreground truncate">{a.title[lang]}</div>
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
            <div className="font-medium text-foreground truncate">{v.title[lang]}</div>
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
      <h2 className="font-display text-2xl text-primary">{title}</h2>
      {children}
      <style>{`.input{display:block;width:100%;border-radius:.5rem;border:1px solid var(--border);background:var(--background);padding:.55rem .75rem;font-size:.875rem;color:var(--foreground);}.input:focus{outline:none;border-color:var(--emerald)}`}</style>
    </div>
  );
}
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-xl text-primary mb-4">{title}</h2>
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
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-emerald h-4 w-4" />
        {L("Publish now (otherwise save as draft)", "النشر الآن (وإلا حفظ كمسودة)")[lang]}
      </label>
      <button onClick={onSave} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)]">
        <Save className="h-4 w-4" /> {pub ? L("Publish", "نشر")[lang] : L("Save Draft", "حفظ كمسودة")[lang]}
      </button>
    </div>
  );
}
function Empty({ lang }: { lang: "en" | "ar" }) {
  return <div className="text-sm text-muted-foreground py-6 text-center">{L("No items yet.", "لا توجد عناصر بعد.")[lang]}</div>;
}

function ManageUsers() {
  const { lang } = useI18n();
  const [profiles, setProfiles] = useState<Array<{ id: string; user_id: string; full_name: string; email: string; grade: string }>>([]);
  const [roles, setRoles] = useState<Array<{ user_id: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, email, grade").order("created_at", { ascending: false }),
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
          <button onClick={() => void promoteByEmail()} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-emerald">
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
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.full_name || p.email}</div>
                <div className="text-xs text-muted-foreground">{p.email} · {L("Grade", "الصف")[lang]}: {p.grade || "—"}</div>
              </div>
              <span className="text-xs rounded-full border border-border px-2 py-1">
                {isAdmin(p.user_id) ? "Admin" : "Student"}
              </span>
              {isAdmin(p.user_id) ? (
                <button onClick={() => void revokeAdmin(p.user_id)} className="text-xs text-destructive hover:underline">
                  {L("Revoke Admin", "إلغاء المدير")[lang]}
                </button>
              ) : (
                <button onClick={() => void grantAdmin(p.user_id)} className="text-xs text-emerald hover:underline">
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
// suppress unused
void X;
