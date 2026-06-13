import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getAccountRole, isParentAccount, postAuthPathForRole } from "@/lib/account-role";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import { grades } from "@/lib/curriculum";

export const Route = createFileRoute("/parent/settings")({
  head: () => ({
    meta: [
      { title: "Parent Profile — Ignite Islamic Academy" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParentSettingsPage,
});

function ParentSettingsPage() {
  const navigate = useNavigate();
  const { tr, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      if (!auth.user) {
        navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
        return;
      }
      const parent = await isParentAccount(auth.user.id);
      if (!parent) {
        const role = await getAccountRole(auth.user.id);
        navigate({ to: postAuthPathForRole(role) });
        return;
      }
      const { data: profile } = await supabase
        .from("parent_profiles")
        .select("full_name, email, student_name, student_grade")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!active) return;
      setFullName(profile?.full_name ?? "");
      setEmail(profile?.email ?? auth.user.email ?? "");
      setStudentName(profile?.student_name ?? "");
      setStudentGrade(profile?.student_grade ?? "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Signed out");
    navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
  }

  const gradeName =
    gradeDisplayName(studentGrade, lang) ||
    grades.find((g) => g.slug === studentGrade)?.name[lang] ||
    studentGrade;

  return (
    <PageShell
      eyebrow={tr("nav_parent")}
      title={tr("parent_profile_title")}
      lead={tr("parent_profile_lead")}
      crumbs={[
        { label: tr("nav_parent"), to: "/parent" },
        { label: tr("parent_dashboard_title"), to: "/parent/dashboard" },
        { label: tr("parent_profile_title") },
      ]}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">{tr("parent_profile_loading")}</p>
      ) : (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "اسم ولي الأمر" : "Parent name"}
                  </div>
                  <div className="font-display text-xl text-foreground mt-1">{fullName || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{tr("your_email")}</div>
                  <div className="text-sm mt-1">{email || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "الطالب المرتبط" : "Linked student"}
                  </div>
                  <div className="text-sm mt-1">
                    {studentName || "—"}
                    {studentGrade ? ` · ${gradeName}` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/parent/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              {tr("parent_dashboard_cta")}
            </Link>
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
