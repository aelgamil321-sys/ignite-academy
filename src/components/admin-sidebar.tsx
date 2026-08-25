import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen, Video, FileUp, Newspaper, Folder, GraduationCap,
  Layers, ClipboardCheck, Megaphone, LogOut, Users, BarChart3, FileText, School,
} from "lucide-react";
import {useI18n, L } from "@/lib/i18n";

export type AdminTab =
  | "overview" | "new-lesson" | "new-article" | "new-video" | "new-file"
  | "manage-resources" | "manage-grades" | "manage-units" | "manage-quizzes" | "manage-announcements" | "manage-users" | "manage-parent-links";


const createItems: Array<{ key: AdminTab; label: ReturnType<typeof L>; icon: typeof BookOpen }> = [
  { key: "overview", label: L("Overview", "نظرة عامة"), icon: GraduationCap },
  { key: "new-lesson", label: L("Add New Lesson", "إضافة درس جديد"), icon: BookOpen },
  { key: "new-article", label: L("Add New Article", "إضافة مقال جديد"), icon: Newspaper },
  { key: "new-video", label: L("Add New Video", "إضافة فيديو جديد"), icon: Video },
  { key: "new-file", label: L("Upload New File", "رفع ملف جديد"), icon: FileUp },
];

const manageTabItems: Array<{ key: AdminTab; label: ReturnType<typeof L>; icon: typeof BookOpen }> = [
  { key: "manage-resources", label: L("Manage Resources", "إدارة الموارد"), icon: Folder },
  { key: "manage-grades", label: L("Manage Grades", "إدارة الصفوف"), icon: GraduationCap },
  { key: "manage-units", label: L("Manage Units", "إدارة الوحدات"), icon: Layers },
  { key: "manage-quizzes", label: L("Manage Quizzes", "إدارة الاختبارات"), icon: ClipboardCheck },
  { key: "manage-announcements", label: L("Manage Announcements", "إدارة الإعلانات"), icon: Megaphone },
  { key: "manage-users", label: L("Manage Users", "إدارة المستخدمين"), icon: GraduationCap },
  { key: "manage-parent-links", label: L("Parent Links", "ربط أولياء الأمور"), icon: Users },
];

function sideClass(active: boolean) {
  return `w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
  }`;
}

export function AdminSidebar({
  email,
  activeTab,
  onLogout,
}: {
  email: string;
  activeTab?: AdminTab;
  onLogout: () => void;
}) {
  const { lang, bi } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onLessonsRoute = pathname === "/admin/lessons" || pathname.startsWith("/admin/lessons/");
  const onQuizSubmissionsRoute =
    pathname === "/admin/quiz-submissions" || pathname.startsWith("/admin/quiz-submissions/");
  const onAssignmentsRoute =
    pathname === "/admin/assignments" || pathname.startsWith("/admin/assignments/");
  const onAnalyticsRoute =
    pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics/");
  const onTeachersRoute =
    pathname === "/admin/teachers" || pathname.startsWith("/admin/teachers/");
  const onDedicatedRoute = onLessonsRoute || onQuizSubmissionsRoute || onAssignmentsRoute || onAnalyticsRoute || onTeachersRoute;

  return (
    <aside className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] h-fit">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 py-2">
        {L("Create", "إنشاء")[lang]}
      </div>
      {createItems.map((s) => {
        const Icon = s.icon;
        const active = !onDedicatedRoute && activeTab === s.key;
        return (
          <Link
            key={s.key}
            to="/admin"
            search={{ tab: s.key }}
            className={sideClass(active)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-start">{bi(s.label)}</span>
          </Link>
        );
      })}

      <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 py-2 mt-2">
        {L("Manage", "إدارة")[lang]}
      </div>

      <Link to="/admin/lessons" search={{}} className={sideClass(onLessonsRoute)}>
        <BookOpen className="h-4 w-4 shrink-0" />
        <span className="text-start">{L("Manage Lessons", "إدارة الدروس")[lang]}</span>
      </Link>

      <Link to="/admin/quiz-submissions" search={{}} className={sideClass(onQuizSubmissionsRoute)}>
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        <span className="text-start">{L("Quiz Submissions", "إرسالات الاختبارات")[lang]}</span>
      </Link>

      <Link to="/admin/assignments" search={{}} className={sideClass(onAssignmentsRoute)}>
        <FileText className="h-4 w-4 shrink-0" />
        <span className="text-start">{L("Assignments", "الواجبات")[lang]}</span>
      </Link>

      <Link to="/admin/analytics" search={{}} className={sideClass(onAnalyticsRoute)}>
        <BarChart3 className="h-4 w-4 shrink-0" />
        <span className="text-start">{L("Analytics", "التحليلات")[lang]}</span>
      </Link>

      <Link to="/admin/teachers" search={{}} className={sideClass(onTeachersRoute)}>
        <School className="h-4 w-4 shrink-0" />
        <span className="text-start">{L("Teachers", "المعلمون")[lang]}</span>
      </Link>

      {manageTabItems.map((s) => {
        const Icon = s.icon;
        const active = !onDedicatedRoute && activeTab === s.key;
        return (
          <Link
            key={s.key}
            to="/admin"
            search={{ tab: s.key }}
            className={sideClass(active)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-start">{bi(s.label)}</span>
          </Link>
        );
      })}

      <div className="mt-3 pt-3 border-t border-border px-3">
        <div className="text-[11px] text-muted-foreground mb-2 truncate">{email}</div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted w-full justify-center"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </aside>
  );
}
