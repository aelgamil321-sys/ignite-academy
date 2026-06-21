import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { ParentLinkCodeCard } from "@/components/parent-link-code-card";
import { StudentProgressDashboard } from "@/components/student-progress-dashboard";
import { StudentAssignmentsLinkCard } from "@/components/parent-assignments-section";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import { fetchMyParentLinkCode } from "@/lib/parent-link-code";
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
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [gradeSlug, setGradeSlug] = useState("8");
  const [profileComplete, setProfileComplete] = useState(true);
  const [parentLinkCode, setParentLinkCode] = useState<string | null>(null);

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

      const code = await fetchMyParentLinkCode();

      setUserId(data.user.id);
      setEmail(profile?.email ?? data.user.email ?? "");
      setGradeSlug(normalizeGradeSlug(profile?.grade ?? "8") || "8");
      setParentLinkCode(code);
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
      <PageShell
        eyebrow={tr("nav_student")}
        title={tr("student_dashboard_title")}
        lead={tr("checking_access")}
        crumbs={[{ label: tr("nav_student") }]}
      >
        <div className="text-sm text-muted-foreground">{tr("verifying_access")}</div>
      </PageShell>
    );
  }

  return (
    <StudentDashboardPage
      userId={userId}
      email={email}
      gradeSlug={gradeSlug}
      profileComplete={profileComplete}
      parentLinkCode={parentLinkCode}
    />
  );
}

function StudentDashboardPage({
  userId,
  email,
  gradeSlug,
  profileComplete,
  parentLinkCode,
}: {
  userId: string;
  email: string;
  gradeSlug: string;
  profileComplete: boolean;
  parentLinkCode: string | null;
}) {
  const navigate = useNavigate();
  const { tr, trf, lang, bi } = useI18n();
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const myGrade = grades.find((g) => g.slug === gradeSlug) ?? grades.find((g) => g.slug === "8")!;
  const gradeName = gradeDisplayName(myGrade.slug, lang) || bi(myGrade.name);

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
    toast.success(tr("signed_out"));
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
          <span className="text-muted-foreground">{tr("welcome_greeting")}, </span>
          <span className="font-semibold text-primary">{email}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/student/profile"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            {tr("profile_student")}
          </Link>
          <button
            type="button"
            onClick={() => { void signOut(); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> {tr("sign_out")}
          </button>
        </div>
      </div>

      {!profileComplete && (
        <div className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{tr("student_complete_profile_notice")}</p>
          <Link
            to="/student/profile"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            {tr("profile_student")}
          </Link>
        </div>
      )}

      {parentLinkCode ? <ParentLinkCodeCard code={parentLinkCode} /> : null}

      <div className="mb-6">
        <StudentAssignmentsLinkCard />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          {tr("student_loading_progress")}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {trf("student_load_progress_error", { error: loadError })}
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
