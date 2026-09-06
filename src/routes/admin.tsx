import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { AdminPageShell } from "@/components/admin-page-shell";
import {useI18n, L } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson, type CustomVideo, type CustomFile, type CustomArticle, type FileType, type ArticleCategory } from "@/lib/cms";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/categories";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import { formatStudentAcademics, normalizeIslamicGroup, normalizeStudentSection, type StudentSection } from "@/lib/student-academics";
import { buildUserRoleIndex, filterProfilesToStudents, isStudentAccount } from "@/lib/student-account";
import type { AnnouncementAudience } from "@/lib/announcement-audience";
import type { AnnouncementTopic } from "@/lib/announcement-topics";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
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
import { AcademyHomepage } from "@/components/academy-homepage";
import { AnnouncementTargetingFields } from "@/components/announcement-targeting-fields";
import { DeleteLessonButton } from "@/components/admin-manage-lessons";
import { AdminNewLesson } from "@/components/admin-new-lesson";
import { shouldDeferToPasswordReset } from "@/lib/password-recovery";
import { fetchAdminProfileSummary, type AdminProfileSummary } from "@/lib/admin-profile";
import {
  adminContentIsReadOnly,
  useAdminContentActor,
} from "@/lib/admin-content-ownership";
import { AdminContentViewLink } from "@/components/admin-content-view-link";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import type { TKey } from "@/lib/i18n";

export const adminRouteSearch = (search: Record<string, unknown>) => ({
  tab: typeof search.tab === "string" ? (search.tab as AdminTab) : undefined,
});

export const adminRouteHead = () => ({
  meta: [
    { title: "Admin Dashboard — Ignite Islamic Academy" },
    { name: "description", content: "Manage lessons, articles, videos, quizzes, resources and announcements for Ignite Islamic Academy." },
    { name: "robots", content: "noindex,nofollow" },
  ],
});

export function AdminGate() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const [profile, setProfile] = useState<AdminProfileSummary | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (shouldDeferToPasswordReset()) {
        window.location.replace("/reset-password");
        return;
      }
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
      setProfile(await fetchAdminProfileSummary(u.user.id, u.user.email ?? ""));
      setState("ok");
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/admin-login" });
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  if (state !== "ok" || !profile) {
    return (
      <PageShell
        eyebrow={tr("nav_admin")}
        title={tr("admin_title")}
        lead={tr("checking_access")}
        crumbs={[{ label: tr("nav_admin") }]}
      >
        <div className="text-sm text-muted-foreground">{tr("verifying_access")}</div>
      </PageShell>
    );
  }
  return <AdminLayoutShell profile={profile} />;
}

async function handleLogout(navigate: ReturnType<typeof useNavigate>, signedOutMessage: string) {
  await supabase.auth.signOut();
  toast.success(signedOutMessage);
  navigate({ to: "/admin-login" });
}

type Tab = AdminTab;


function parseAdminTab(search: Record<string, unknown>): Tab | undefined {
  return typeof search.tab === "string" ? (search.tab as Tab) : undefined;
}

export function AdminLayoutShell({ profile }: { profile: AdminProfileSummary }) {
  const navigate = useNavigate();
  const { lang, bi, biMaybe, tr } = useI18n();
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
  const onTeachers =
    pathname === "/admin/teachers" ||
    pathname === "/admin/teachers/" ||
    pathname.startsWith("/admin/teachers/");
  const onTeachersDirectory =
    pathname === "/admin/teachers" || pathname === "/admin/teachers/";
  const onTeachersManage =
    pathname === "/admin/teachers/manage" || pathname === "/admin/teachers/manage/";
  const onTeachersDetail =
    onTeachers && !onTeachersDirectory && !onTeachersManage;
  const onWeeklyPlanningDashboardRoute =
    pathname === "/admin/weekly-planning/dashboard" ||
    pathname.startsWith("/admin/weekly-planning/review/");
  const onParents =
    pathname === "/admin/parents" || pathname === "/admin/parents/";
  const onHonorBoard =
    pathname === "/admin/honor-board" || pathname === "/admin/honor-board/";
  const onStudents =
    pathname === "/admin/students" || pathname.startsWith("/admin/students/");
  const onContentRoute =
    pathname === "/admin/content" || pathname === "/admin/content/";

  const adminLabel = L("Admin", "الإدارة")[lang];
  const manageLessonsLabel = L("Manage Lessons", "إدارة الدروس")[lang];
  const quizSubmissionsLabel = L("Quiz Submissions", "إرسالات الاختبارات")[lang];
  const assignmentsLabel = L("Assignments Management", "إدارة الواجبات")[lang];
  const analyticsLabel = L("Analytics", "التحليلات")[lang];
  const teachersLabel = L("Teachers", "المعلمون")[lang];
  const weeklyPlanningLabel = tr("admin_nav_weekly_planning");
  const onAdminHome = pathname === "/admin" && tab === "overview";
  const onCmsWorkspace = pathname === "/admin" && tab !== "overview";
  const onGradesRoute =
    pathname === "/admin/grades" || pathname.startsWith("/admin/grades/");
  const gradesPathMatch = pathname.match(/^\/admin\/grades\/([^/]+)/);
  const gradesDetailSlug = gradesPathMatch?.[1] ?? null;
  const onGradesDetailRoute =
    !!gradesDetailSlug && pathname !== "/admin/grades" && pathname !== "/admin/grades/";
  const title = onAdminHome
    ? tr("admin_home_title")
    : onParents
    ? tr("admin_home_parent_directory_title")
    : onHonorBoard
    ? tr("admin_home_honor_board_title")
    : onStudents
    ? tr("admin_students_title")
    : onContentRoute
    ? tr("admin_content_title")
    : onTeachersManage
    ? tr("admin_teachers_manage_title")
    : onTeachersDetail
    ? tr("admin_teachers_detail_title")
    : onTeachersDirectory
    ? tr("admin_teachers_title")
    : onGradesRoute
    ? tr("all_stages")
    : onWeeklyPlanningDashboardRoute
    ? weeklyPlanningLabel
    : onTeachers
    ? teachersLabel
    : onAnalytics
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
  const lead = onAdminHome
    ? tr("admin_home_lead_short")
    : onParents
    ? tr("admin_home_parent_directory_lead")
    : onHonorBoard
    ? tr("admin_home_honor_board_lead")
    : onStudents
    ? tr("admin_students_lead")
    : onContentRoute
    ? tr("admin_content_lead")
    : onTeachersManage
    ? tr("admin_teachers_manage_lead")
    : onTeachersDirectory || onTeachersDetail
    ? tr("admin_teachers_lead")
    : onGradesRoute
    ? tr("stages_desc")
    : onWeeklyPlanningDashboardRoute
    ? tr("wp_dept_lead")
    : onTeachers
    ? L(
        "Assign teacher roles and manage grade, section, and Islamic group teaching scope.",
        "عيّن صلاحيات المعلمين وأدر نطاق التدريس حسب الصف والشعبة والمجموعة الإسلامية.",
      )[lang]
    : onAnalytics
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
  const crumbs = onParents
    ? [
        { label: adminLabel, to: "/admin", search: { tab: "overview" } },
        { label: tr("admin_nav_parents") },
      ]
    : onHonorBoard
    ? [
        { label: adminLabel, to: "/admin", search: { tab: "overview" } },
        { label: tr("admin_nav_honor_board") },
      ]
    : onStudents
    ? [
        { label: adminLabel, to: "/admin", search: { tab: "overview" } },
        { label: tr("admin_nav_students"), to: "/admin/students" },
        ...(pathname.startsWith("/admin/students/") && pathname !== "/admin/students" && pathname !== "/admin/students/"
          ? [{ label: tr("admin_students_detail_title") }]
          : []),
      ]
    : onContentRoute
    ? [{ label: adminLabel, to: "/admin", search: { tab: "overview" } }, { label: tr("admin_nav_content") }]
    : onGradesRoute
    ? [
        { label: adminLabel, to: "/admin", search: { tab: "overview" } },
        { label: tr("admin_nav_grades"), to: "/admin/grades" },
        ...(onGradesDetailRoute && gradesDetailSlug
          ? [{ label: gradeDisplayName(gradesDetailSlug, lang) }]
          : []),
      ]
    : onWeeklyPlanningDashboardRoute
    ? [{ label: adminLabel, to: "/admin", search: { tab: "overview" } }, { label: weeklyPlanningLabel }]
    : onTeachers
    ? [
        { label: adminLabel, to: "/admin", search: { tab: "overview" } },
        { label: tr("admin_nav_teachers"), to: "/admin/teachers" },
        ...(onTeachersManage ? [{ label: tr("admin_teachers_manage_title") }] : []),
        ...(onTeachersDetail ? [{ label: tr("admin_teachers_detail_title") }] : []),
      ]
    : onAnalytics
    ? [{ label: adminLabel, to: "/admin", search: { tab: "overview" } }, { label: tr("admin_nav_analytics") }]
    : onQuizSubmissions
    ? [{ label: adminLabel, to: "/admin", search: { tab: "overview" } }, { label: quizSubmissionsLabel }]
    : onAssignments
    ? [{ label: adminLabel, to: "/admin", search: { tab: "overview" } }, { label: assignmentsLabel }]
    : onLessonsList
      ? [
          { label: adminLabel, to: "/admin", search: { tab: "overview" } },
          { label: tr("admin_nav_content"), to: "/admin/content" },
          { label: manageLessonsLabel },
        ]
      : onLessonsEdit
        ? [
            { label: adminLabel, to: "/admin", search: { tab: "overview" } },
            { label: tr("admin_nav_content"), to: "/admin/content" },
            { label: manageLessonsLabel, to: "/admin/lessons" },
            { label: L("Edit", "تعديل")[lang] },
          ]
        : [{ label: title }];

  return (
    <AdminPageShell
      eyebrow={onAdminHome ? undefined : adminLabel}
      title={title}
      lead={onAdminHome ? undefined : lead}
      crumbs={onAdminHome ? undefined : crumbs}
      hidePageHeader={onAdminHome}
      fullWidthContent={onAdminHome}
      profile={{
        fullName: profile.fullName,
        email: profile.email,
        profilePhotoPath: profile.profilePhotoPath,
      }}
      onLogout={() => void handleLogout(navigate, tr("signed_out"))}
    >
      {onCmsWorkspace ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[260px,1fr]">
          <AdminSidebar
            email={profile.email}
            activeTab={tab}
            onLogout={() => void handleLogout(navigate, tr("signed_out"))}
          />
          <div className="min-w-0 space-y-4">
            <Outlet />
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </AdminPageShell>
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
      {tab !== "overview" && <DebugPanel />}
      {tab === "overview" && <Overview />}
      {tab === "new-lesson" && <AdminNewLesson />}
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
  const { tr } = useI18n();
  const dotClass = debug.lastStatus === "error" ? "bg-red-500" : debug.lastStatus === "success" ? "bg-primary" : "bg-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <div className="font-sans text-sm font-semibold">{tr("admin_cms_debug")}</div>
        <button onClick={() => void refresh()} className="px-2 py-1 rounded border border-border hover:bg-muted text-[11px]">{tr("admin_refetch")}</button>
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
  return <AcademyHomepage signedIn variant="admin" />;
}

// ============ Article Form ============
function ArticleForm() {
  const { lang, bi, biMaybe } = useI18n();
  const { addArticle } = useCMS();
  const [titleEn, setTitleEn] = useState(""); const [titleAr, setTitleAr] = useState("");
  const [bodyEn, setBodyEn] = useState(""); const [bodyAr, setBodyAr] = useState("");
  const [cat, setCat] = useState<ArticleCategory>("announcement");
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>("quran");
  const [grade, setGrade] = useState("");
  const [targetSection, setTargetSection] = useState<StudentSection | "">("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [announcementTopic, setAnnouncementTopic] = useState<AnnouncementTopic>("school_news");
  const [img, setImg] = useState<string>("");
  const [pub, setPub] = useState(true);
  const isAnnouncement = cat === "announcement";
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
        grade: isAnnouncement && grade ? normalizeGradeSlug(grade) : undefined,
        targetSection: isAnnouncement && targetSection ? targetSection : null,
        audience: isAnnouncement ? audience : null,
        announcementTopic: isAnnouncement ? announcementTopic : null,
        published: pub,
      });
      toast.success(pub ? L("Article published!", "تم نشر المقال!")[lang] : L("Saved as draft", "حُفظ كمسودة")[lang]);
      setTitleEn(""); setTitleAr(""); setBodyEn(""); setBodyAr(""); setImg("");
      setGrade(""); setTargetSection(""); setAudience("all"); setAnnouncementTopic("school_news");
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
      {isAnnouncement ? (
        <AnnouncementTargetingFields
          grade={grade}
          setGrade={setGrade}
          targetSection={targetSection}
          setTargetSection={setTargetSection}
          audience={audience}
          setAudience={setAudience}
          topic={announcementTopic}
          setTopic={setAnnouncementTopic}
        />
      ) : null}
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
            <option value="pdf">PDF</option><option value="ppt">{L("PowerPoint", "PowerPoint")[lang]}</option><option value="worksheet">{L("Worksheet", "ورقة العمل")[lang]}</option><option value="image">{L("Image", "صورة")[lang]}</option>
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
  children, onPublish, onDelete, published, viewLink, lessonDelete, readOnly,
}: {
  children: React.ReactNode;
  onPublish: () => void;
  onDelete: () => void;
  published: boolean;
  viewLink?: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    labelKey?: TKey;
  };
  lessonDelete?: CustomLesson;
  readOnly?: boolean;
}) {
  const { lang, biMaybe, tr } = useI18n();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex-1 min-w-0 space-y-1 w-full">{children}</div>
      <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
        {viewLink ? <AdminContentViewLink {...viewLink} /> : null}
        {!readOnly ? (
          <>
            <button onClick={onPublish} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${published ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {published ? <><Eye className="h-3.5 w-3.5" /> {tr("teacher_published")}</> : <><EyeOff className="h-3.5 w-3.5" /> {tr("teacher_draft")}</>}
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
          </>
        ) : null}
      </div>
    </div>
  );
}

function ManageResources() {
  const { lang, bi, biMaybe } = useI18n();
  const { files, updateFile, deleteFile, lessons, updateLesson } = useCMS();
  const actorId = useAdminContentActor();
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [
      ...files.map((f) => f.createdBy).filter(Boolean),
      ...lessons.map((l) => l.createdBy).filter(Boolean),
    ] as string[];
    if (ids.length === 0) {
      setCreatorNames({});
      return;
    }
    void fetchAnnouncementCreatorNames(ids).then(setCreatorNames);
  }, [files, lessons]);

  return (
    <div className="space-y-6">
      <SectionCard title={L("Uploaded Files", "الملفات المرفوعة")[lang]}>
        {files.length === 0 ? <Empty lang={lang} /> : files.map((f: CustomFile) => {
          const readOnly = adminContentIsReadOnly("file", f.createdBy, actorId);
          const creatorName = f.createdBy ? creatorNames[f.createdBy] : null;
          return (
          <ItemRow key={f.id} published={f.published} readOnly={readOnly}
            viewLink={{
              to: "/admin/files/$fileId",
              params: { fileId: f.id },
              labelKey: "admin_content_view_file",
            }}
            onPublish={() => updateFile(f.id, { published: !f.published })}
            onDelete={() => { deleteFile(f.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}>
            <div className="font-medium text-foreground truncate">{bi(f.title)}</div>
            <div className="text-xs text-muted-foreground">
              {f.type.toUpperCase()} · {f.size} · {f.fileName}
              {creatorName ? ` · ${creatorName}` : ""}
            </div>
          </ItemRow>
        );})}
      </SectionCard>
      <SectionCard title={L("Custom Lessons", "الدروس المخصصة")[lang]}>
        {lessons.length === 0 ? <Empty lang={lang} /> : lessons.map((l: CustomLesson) => {
          const readOnly = adminContentIsReadOnly("lesson", l.createdBy, actorId);
          const creatorName = l.createdBy ? creatorNames[l.createdBy] : null;
          return (
          <ItemRow key={l.id} published={l.published} readOnly={readOnly}
            viewLink={{
              to: "/admin/grades/$grade/$lesson",
              params: { grade: l.grade, lesson: l.id },
            }}
            onPublish={() => updateLesson(l.id, { published: !l.published })}
            onDelete={() => {}}
            lessonDelete={readOnly ? undefined : l}>
            <div className="font-medium text-foreground truncate">{bi(l.title)}</div>
            <div className="text-xs text-muted-foreground">
              {L("Grade", "الصف")[lang]}: {biMaybe(grades.find(g => g.slug === l.grade)?.name) || l.grade}
              {creatorName ? ` · ${creatorName}` : ""}
            </div>
          </ItemRow>
        );})}
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
  const actorId = useAdminContentActor();
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = lessons.map((l) => l.createdBy).filter(Boolean) as string[];
    if (ids.length === 0) {
      setCreatorNames({});
      return;
    }
    void fetchAnnouncementCreatorNames(ids).then(setCreatorNames);
  }, [lessons]);

  return (
    <SectionCard title={L("Custom Lesson Quizzes", "اختبارات الدروس المخصصة")[lang]}>
      {lessons.length === 0 ? <Empty lang={lang} /> : lessons.map((l) => {
        const readOnly = adminContentIsReadOnly("quiz", l.createdBy, actorId);
        const creatorName = l.createdBy ? creatorNames[l.createdBy] : null;
        return (
        <ItemRow key={l.id} published={l.published} readOnly={readOnly}
          viewLink={{
            to: "/admin/quizzes/$lessonId",
            params: { lessonId: l.id },
            labelKey: "admin_content_view_quiz",
          }}
          onPublish={() => updateLesson(l.id, { published: !l.published })}
          onDelete={() => {}}
          lessonDelete={readOnly ? undefined : l}>
          <div className="font-medium text-foreground truncate">{bi(l.title)}</div>
          <div className="text-xs text-muted-foreground">
            {l.quiz.length} {L("questions", "أسئلة")[lang]} · {biMaybe(grades.find(g => g.slug === l.grade)?.name) || l.grade}
            {creatorName ? ` · ${creatorName}` : ""}
          </div>
        </ItemRow>
      );})}
    </SectionCard>
  );
}

function ManageAnnouncements() {
  const { lang, bi, tr } = useI18n();
  const { articles, updateArticle, deleteArticle, videos: cvids, updateVideo, deleteVideo } = useCMS();
  const actorId = useAdminContentActor();
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [
      ...articles.map((a) => a.createdBy).filter(Boolean),
      ...cvids.map((v) => v.createdBy).filter(Boolean),
    ] as string[];
    if (ids.length === 0) {
      setCreatorNames({});
      return;
    }
    void fetchAnnouncementCreatorNames(ids).then(setCreatorNames);
  }, [articles, cvids]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-foreground">{L("Manage Announcements", "إدارة الإعلانات")[lang]}</h2>
        <Link
          to="/admin"
          search={{ tab: "new-article" }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {tr("admin_home_add_announcement")}
        </Link>
      </div>
      <SectionCard title={L("Articles", "المقالات")[lang]}>
        {articles.length === 0 ? <Empty lang={lang} /> : articles.map((a: CustomArticle) => {
          const readOnly = adminContentIsReadOnly("article", a.createdBy, actorId);
          const creatorName = a.createdBy ? creatorNames[a.createdBy] : null;
          return (
          <ItemRow key={a.id} published={a.published} readOnly={readOnly}
            viewLink={{
              to: "/admin/announcements/$articleId",
              params: { articleId: a.id },
              labelKey: "admin_content_view_announcement",
            }}
            onPublish={() => updateArticle(a.id, { published: !a.published })}
            onDelete={() => { deleteArticle(a.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}>
            <div className="font-medium text-foreground truncate">{bi(a.title)}</div>
            <div className="text-xs text-muted-foreground">
              {a.category === "announcement" ? L("Announcement", "إعلان")[lang] : L("Parent Corner", "ركن الوالدين")[lang]}
              {creatorName ? ` · ${creatorName}` : ""}
            </div>
          </ItemRow>
        );})}
      </SectionCard>
      <SectionCard title={L("Videos", "الفيديوهات")[lang]}>
        {cvids.length === 0 ? <Empty lang={lang} /> : cvids.map((v: CustomVideo) => {
          const readOnly = adminContentIsReadOnly("video", v.createdBy, actorId);
          const creatorName = v.createdBy ? creatorNames[v.createdBy] : null;
          return (
          <ItemRow key={v.id} published={v.published} readOnly={readOnly}
            viewLink={{
              to: "/admin/videos/$videoId",
              params: { videoId: v.id },
              labelKey: "admin_content_view_video",
            }}
            onPublish={() => updateVideo(v.id, { published: !v.published })}
            onDelete={() => { deleteVideo(v.id); toast.success(L("Deleted", "تم الحذف")[lang]); }}>
            <div className="font-medium text-foreground truncate">{bi(v.title)}</div>
            <div className="text-xs text-muted-foreground">
              {v.grade}
              {creatorName ? ` · ${creatorName}` : ""}
            </div>
          </ItemRow>
        );})}
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
      const roleIndex = buildUserRoleIndex(rolesRes.data ?? []);
      const studentRows = filterProfilesToStudents(profilesRes.data ?? [], roleIndex);

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
