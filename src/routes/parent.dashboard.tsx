import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LogOut, LayoutDashboard, User } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { ParentAccountRequired } from "@/components/parent-account-required";
import { ParentChildSelector } from "@/components/parent-child-selector";
import { ParentDashboardView } from "@/components/parent-dashboard";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import {
  fetchParentDashboardBundle,
  type ParentDashboardData,
  type ParentLinkedChild,
} from "@/lib/parent-dashboard";
import {
  resolveSelectedChild,
  storeParentChildId,
} from "@/lib/parent-children";
import { isParentAccount } from "@/lib/account-role";
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
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
        return;
      }
      const parent = await isParentAccount(data.user.id);
      if (!parent) {
        setState("denied");
        return;
      }
      setUserId(data.user.id);
      setState("ok");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (state === "denied") {
    return (
      <PageShell
        eyebrow={tr("nav_parent")}
        title={tr("parent_dashboard_title")}
        lead={tr("parent_dashboard_lead")}
        crumbs={[{ label: tr("nav_parent"), to: "/parent" }, { label: tr("parent_dashboard_title") }]}
      >
        <ParentAccountRequired />
      </PageShell>
    );
  }

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
  const [children, setChildren] = useState<ParentLinkedChild[]>([]);
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingChild, setSwitchingChild] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<"none" | "multiple" | null>(null);

  const loadDashboard = useCallback(
    async (studentUserId?: string | null, options?: { initial?: boolean }) => {
      const isInitial = options?.initial ?? false;
      if (isInitial) setLoading(true);
      else setSwitchingChild(true);

      setLoadError(null);
      setLinkError(null);

      const bundle = await fetchParentDashboardBundle(userId, studentUserId);

      if (bundle.linkError) {
        setLinkError(bundle.linkError);
        setChildren([]);
        setDashboard(null);
        setSelectedStudentUserId(null);
      } else if (bundle.error) {
        setLoadError(bundle.error);
        setChildren([]);
        setDashboard(null);
        setSelectedStudentUserId(null);
      } else if (bundle.dashboardError) {
        setLoadError(bundle.dashboardError);
        setChildren(bundle.children);
        setDashboard(null);
        setSelectedStudentUserId(studentUserId ?? bundle.children[0]?.studentUserId ?? null);
      } else {
        const resolved = resolveSelectedChild(bundle.children, userId, studentUserId);
        setChildren(bundle.children);
        setSelectedStudentUserId(resolved?.studentUserId ?? null);
        setDashboard(bundle.dashboard);
        if (resolved) storeParentChildId(userId, resolved.studentUserId);
      }

      if (isInitial) setLoading(false);
      else setSwitchingChild(false);
    },
    [userId],
  );

  useEffect(() => {
    void loadDashboard(undefined, { initial: true });
  }, [loadDashboard]);

  const handleSelectChild = (studentUserId: string) => {
    if (studentUserId === selectedStudentUserId) return;
    setSelectedStudentUserId(studentUserId);
    storeParentChildId(userId, studentUserId);
    void loadDashboard(studentUserId);
  };

  const gradeSlug = normalizeGradeSlug(dashboard?.gradeSlug ?? "8") || "8";
  const myGrade = grades.find((grade) => grade.slug === gradeSlug) ?? grades.find((grade) => grade.slug === "8")!;
  const gradeName = gradeDisplayName(myGrade.slug, lang) || myGrade.name[lang];

  async function signOut() {
    await supabase.auth.signOut();
    toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Signed out");
    navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
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
          {children.length > 1
            ? L(
                "Signed in to view your children's learning progress.",
                "أنت مسجّل الدخول لمتابعة تقدّم أبنائك التعليمي.",
              )[lang]
            : L(
                "Signed in to view your child's learning progress.",
                "أنت مسجّل الدخول لمتابعة تقدّم ابنك/ابنتك التعليمي.",
              )[lang]}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/parent/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            {tr("parent_profile_title")}
          </Link>
          <Link
            to="/parent"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {tr("nav_parent")}
          </Link>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          {tr("parent_dashboard_loading")}
        </div>
      ) : linkError === "multiple" ? (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {L(
            "More than one student found. Please contact the school to link your account.",
            "تم العثور على أكثر من طالب. يرجى التواصل مع المدرسة لربط حسابك.",
          )[lang]}
        </div>
      ) : linkError === "none" ? (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {L(
            "No matching student found. Please check the student name and grade.",
            "لم يتم العثور على طالب مطابق. يرجى التحقق من اسم الطالب والصف.",
          )[lang]}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {lang === "ar"
            ? `تعذر تحميل لوحة ولي الأمر: ${loadError}`
            : `Could not load parent dashboard: ${loadError}`}
        </div>
      ) : dashboard && selectedStudentUserId ? (
        <div className="space-y-6">
          <ParentChildSelector
            linkedChildren={children}
            selectedStudentUserId={selectedStudentUserId}
            onSelect={handleSelectChild}
          />
          {switchingChild ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {tr("parent_dashboard_switching")}
            </div>
          ) : (
            <ParentDashboardView data={dashboard} gradeName={gradeName} />
          )}
        </div>
      ) : null}
    </PageShell>
  );
}

const L = (en: string, ar: string) => ({ en, ar });
