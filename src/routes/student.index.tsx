import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useLessonsForGrade } from "@/lib/cms";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { GraduationCap, BookOpen, ClipboardCheck, TrendingUp, ArrowRight, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { isStudentProfileComplete } from "@/lib/student-profile";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Ignite Islamic Academy" },
      { name: "description", content: "Your student dashboard: lessons, videos, quizzes, files and progress." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StudentGate,
});

function StudentGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [email, setEmail] = useState("");
  const [gradeSlug, setGradeSlug] = useState("8");
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { navigate({ to: "/auth", search: { mode: "login" } }); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, grade, arabic_name, english_name")
        .eq("user_id", data.user.id)
        .maybeSingle();

      setEmail(profile?.email ?? data.user.email ?? "");
      setGradeSlug(normalizeGradeSlug(profile?.grade ?? "8") || "8");
      setProfileComplete(isStudentProfileComplete(profile));
      setState("ok");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", search: { mode: "login" } });
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  if (state !== "ok") {
    return (
      <PageShell eyebrow="Student" title="Student Dashboard" lead="Checking access…" crumbs={[{ label: "Student" }]}>
        <div className="text-sm text-muted-foreground">Verifying your access…</div>
      </PageShell>
    );
  }
  return <StudentPage email={email} gradeSlug={gradeSlug} profileComplete={profileComplete} />;
}

function StudentPage({
  email,
  gradeSlug,
  profileComplete,
}: {
  email: string;
  gradeSlug: string;
  profileComplete: boolean;
}) {
  const navigate = useNavigate();
  const { tr, lang, dir } = useI18n();
  const myGrade = grades.find((g) => g.slug === gradeSlug) ?? grades.find((g) => g.slug === "8")!;
  const lessons = useLessonsForGrade(myGrade.slug);
  const quizCount = lessons.filter((l) => l.quiz.length > 0).length;

  const stats = [
    { icon: BookOpen, label: tr("recent_lessons"), value: String(lessons.length) },
    { icon: ClipboardCheck, label: tr("my_quizzes"), value: String(quizCount) },
    { icon: TrendingUp, label: tr("my_progress"), value: lessons.length > 0 ? "—" : "0%" },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Signed out");
    navigate({ to: "/auth", search: { mode: "login" } });
  }

  return (
    <PageShell
      eyebrow={tr("nav_student")}
      title={tr("student_title")}
      lead={tr("student_lead")}
      crumbs={[{ label: tr("nav_student") }]}
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="text-sm">
          <span className="text-muted-foreground">{lang === "ar" ? "مرحبًا" : "Welcome"}, </span>
          <span className="font-semibold text-primary">{email}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/student/profile"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-emerald hover:text-emerald transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            {lang === "ar" ? "الملف الشخصي" : "Profile"}
          </Link>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-emerald hover:text-emerald transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
          </button>
        </div>
      </div>

      {!profileComplete && (
        <div className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>
            {lang === "ar"
              ? "يرجى إكمال ملفك الشخصي (الاسم بالإنجليزية والعربية) قبل إنشاء الشهادات."
              : "Please complete your profile (English and Arabic names) before generating certificates."}
          </p>
          <Link
            to="/student/profile"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-emerald transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            {lang === "ar" ? "الملف الشخصي" : "Profile"}
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald/10 text-emerald mb-4">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="font-display text-3xl text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-emerald mb-1">{tr("my_grade")}</div>
            <h2 className="font-display text-2xl text-primary">{myGrade.name[lang]}</h2>
          </div>
          <Link
            to="/grades/$grade"
            params={{ grade: myGrade.slug }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors"
          >
            <GraduationCap className="h-4 w-4" /> {tr("go_to_grade")}
          </Link>
        </div>
        {lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "لا توجد دروس منشورة لهذا الصف بعد. تفقّد الصف لاحقًا."
              : "No published lessons for your grade yet. Check back soon."}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {lessons.slice(0, 6).map((l) => (
              <Link
                key={l.slug}
                to="/grades/$grade/$lesson"
                params={{ grade: myGrade.slug, lesson: l.slug }}
                className="group rounded-xl border border-border bg-background p-4 hover:border-emerald transition-colors"
              >
                <div className="text-xs text-emerald font-semibold uppercase tracking-wider">{l.subject[lang]}</div>
                <div className="mt-1 font-display text-lg text-primary leading-snug">{l.title[lang]}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-sm text-primary group-hover:text-emerald">
                  {tr("open")} <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
