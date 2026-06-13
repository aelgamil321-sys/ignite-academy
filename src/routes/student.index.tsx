import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { StudentProgressDashboard } from "@/components/student-progress-dashboard";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { isStudentProfileComplete } from "@/lib/student-profile";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Ignite Islamic Academy" },
      { name: "description", content: "Your student progress dashboard: lessons completed, quiz scores, and certificates." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StudentGate,
});

function StudentGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [gradeSlug, setGradeSlug] = useState("8");
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, grade, arabic_name, english_name")
        .eq("user_id", data.user.id)
        .maybeSingle();

      setUserId(data.user.id);
      setEmail(profile?.email ?? data.user.email ?? "");
      setGradeSlug(normalizeGradeSlug(profile?.grade ?? "8") || "8");
      setProfileComplete(isStudentProfileComplete(profile));
      setState("ok");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", search: { mode: "login" } });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (state !== "ok" || !userId) {
    return (
      <PageShell eyebrow="Student" title="Student Dashboard" lead="Checking access…" crumbs={[{ label: "Student" }]}>
        <div className="text-sm text-muted-foreground">Verifying your access…</div>
      </PageShell>
    );
  }

  return (
    <StudentDashboardPage
      userId={userId}
      email={email}
      gradeSlug={gradeSlug}
      profileComplete={profileComplete}
    />
  );
}

function StudentDashboardPage({
  userId,
  email,
  gradeSlug,
  profileComplete,
}: {
  userId: string;
  email: string;
  gradeSlug: string;
  profileComplete: boolean;
}) {
  const navigate = useNavigate();
  const { tr, lang } = useI18n();
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const myGrade = grades.find((g) => g.slug === gradeSlug) ?? grades.find((g) => g.slug === "8")!;
  const gradeName = gradeDisplayName(myGrade.slug, lang) || myGrade.name[lang];

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await fetchStudentProgress(userId);
      if (!active) return;
      if (error) setLoadError(error);
      else setProgress(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Signed out");
    navigate({ to: "/auth", search: { mode: "login" } });
  }

  return (
    <PageShell
      eyebrow={tr("nav_student")}
      title={tr("student_dashboard_title")}
      lead={tr("student_dashboard_lead")}
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
            type="button"
            onClick={() => { void signOut(); }}
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

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          {lang === "ar" ? "جارٍ تحميل التقدّم…" : "Loading your progress…"}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {lang === "ar" ? `تعذر تحميل التقدّم: ${loadError}` : `Could not load progress: ${loadError}`}
        </div>
      ) : progress ? (
        <StudentProgressDashboard
          progress={progress}
          gradeName={gradeName}
          gradeSlug={myGrade.slug}
        />
      ) : null}
    </PageShell>
  );
}
