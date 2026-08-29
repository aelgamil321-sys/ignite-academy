import { Link } from "@tanstack/react-router";
import { Award, BookOpen, ClipboardCheck, FileText, Folder, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useStudentShell } from "@/lib/student-shell-context";
import { cn } from "@/lib/utils";

export function StudentQuickActions() {
  const { tr } = useI18n();
  const { gradeSlug, hasGrade } = useStudentShell();

  const myLessonsTo = hasGrade ? `/grades/${gradeSlug}` : "/student/profile";
  const myQuizzesTo = myLessonsTo;

  const actions = [
    { to: myLessonsTo, icon: BookOpen, labelKey: "student_nav_my_lessons" },
    { to: "/assignments", icon: ClipboardCheck, labelKey: "student_nav_assignments" },
    { to: myQuizzesTo, icon: FileText, labelKey: "student_nav_quizzes" },
    { to: "/resources", icon: Folder, labelKey: "student_nav_resources" },
    { to: "/student", hash: "student-achievements", icon: Award, labelKey: "student_nav_achievements" },
    { to: "/student/profile", icon: User, labelKey: "student_nav_profile" },
  ] as const;

  return (
    <section className="min-w-0 rounded-2xl border border-brand-dark/25 bg-brand-dark p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <h3 className="mb-3 font-display text-base font-semibold text-primary sm:text-lg">
        {tr("student_dash_quick_actions")}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.labelKey}
              to={action.to}
              hash={"hash" in action ? action.hash : undefined}
              className={cn(
                "group flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-center transition-colors hover:border-primary/40 hover:bg-white/10 sm:min-h-[5rem] sm:p-3",
              )}
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="line-clamp-2 min-w-0 text-[11px] font-semibold leading-snug text-white group-hover:text-primary sm:text-xs">
                {tr(action.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
