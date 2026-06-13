import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { ParentDashboardView } from "@/components/parent-dashboard";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import { fetchParentDashboardData, type ParentDashboardData } from "@/lib/parent-dashboard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parent/dashboard")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — Ignite Islamic Academy" },
      {
        name: "description",
        content: "Track your child's lesson progress, quiz scores, certificates, badges, and recent activity.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParentDashboardGate,
});

function ParentDashboardGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      setUserId(data.user.id);
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
        eyebrow="Parent"
        title="Parent Dashboard"
        lead="Checking access…"
        crumbs={[{ label: "Parent", to: "/parent" }, { label: "Dashboard" }]}
      >
        <div className="text-sm text-muted-foreground">Verifying your access…</div>
      </PageShell>
    );
  }

  return <ParentDashboardPage userId={userId} />;
}

function ParentDashboardPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { tr, lang } = useI18n();
  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await fetchParentDashboardData(userId);
      if (!active) return;
      if (error) setLoadError(error);
      else setDashboard(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const gradeSlug = normalizeGradeSlug(dashboard?.gradeSlug ?? "8") || "8";
  const myGrade = grades.find((grade) => grade.slug === gradeSlug) ?? grades.find((grade) => grade.slug === "8")!;
  const gradeName = gradeDisplayName(myGrade.slug, lang) || myGrade.name[lang];

  async function signOut() {
    await supabase.auth.signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Signed out");
    navigate({ to: "/auth", search: { mode: "login" } });
  }

  return (
    <PageShell
      eyebrow={tr("nav_parent")}
      title={tr("parent_dashboard_title")}
      lead={tr("parent_dashboard_lead")}
      crumbs={[{ label: tr("nav_parent"), to: "/parent" }, { label: tr("parent_dashboard_title") }]}
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="text-sm text-muted-foreground">
          {L(
            "Signed in to view your child's learning progress.",
            "أنت مسجّل الدخول لمتابعة تقدّم ابنك/ابنتك التعليمي.",
          )[lang]}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/parent"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-emerald hover:text-emerald transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {tr("nav_parent")}
          </Link>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-emerald hover:text-emerald transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          {lang === "ar" ? "جارٍ تحميل لوحة ولي الأمر…" : "Loading parent dashboard…"}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {lang === "ar"
            ? `تعذر تحميل لوحة ولي الأمر: ${loadError}`
            : `Could not load parent dashboard: ${loadError}`}
        </div>
      ) : dashboard ? (
        <ParentDashboardView data={dashboard} gradeName={gradeName} />
      ) : null}
    </PageShell>
  );
}

const L = (en: string, ar: string) => ({ en, ar });
