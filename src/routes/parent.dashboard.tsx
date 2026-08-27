import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LogOut, LayoutDashboard, User } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { ParentAccountRequired } from "@/components/parent-account-required";
import { ParentChildSelector } from "@/components/parent-child-selector";
import { ParentDashboardView } from "@/components/parent-dashboard";
import { PARENT_DASHBOARD_UI_PREVIEW } from "@/lib/parent-dashboard-preview-mock";
import {useI18n, L } from "@/lib/i18n";
import {
  fetchParentDashboardBundle,
  type ParentDashboardData,
  type ParentLinkedChild,
} from "@/lib/parent-dashboard";
import {
  resolveSelectedChild,
  storeParentChildId,
} from "@/lib/parent-children";
import { redeemPendingParentLinkCodeFromMetadata } from "@/lib/parent-link-code";
import { isParentAccount } from "@/lib/account-role";
import { resolveVerifiedSession } from "@/lib/email-verification";
import { EmailVerificationRequired } from "@/components/email-verification-required";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parent/dashboard")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.uiPreview;
    const normalized = raw === true || raw === 1 || raw === "1" || raw === '"1"' ? "1" : undefined;
    return { uiPreview: normalized };
  },
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
  const { uiPreview } = Route.useSearch();
  const [state, setState] = useState<"checking" | "ok" | "denied" | "unverified">("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  useEffect(() => {
    if (import.meta.env.DEV && uiPreview === "1") return;
    let active = true;
    void (async () => {
      const session = await resolveVerifiedSession();
      if (!active) return;
      if (session.status === "none") {
        navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
        return;
      }
      if (session.status === "unverified") {
        setUnverifiedEmail(session.email);
        setState("unverified");
        return;
      }
      const parent = await isParentAccount(session.user.id);
      if (!parent) {
        setState("denied");
        return;
      }
      setUserId(session.user.id);
      setState("ok");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", search: { mode: "login", accountType: "parent" } });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, uiPreview]);

  if (import.meta.env.DEV && uiPreview === "1") {
    return (
      <PageShell
        eyebrow={tr("nav_parent")}
        title={tr("parent_dashboard_title")}
        lead={tr("parent_ui_preview_lead")}
        crumbs={[{ label: tr("nav_parent"), to: "/parent" }, { label: tr("parent_dashboard_title") }]}
      >
        <ParentDashboardView data={PARENT_DASHBOARD_UI_PREVIEW} />
      </PageShell>
    );
  }

  if (state === "unverified") {
    return (
      <PageShell
        eyebrow={tr("nav_parent")}
        title={tr("parent_dashboard_title")}
        lead={tr("auth_email_not_confirmed")}
        crumbs={[{ label: tr("nav_parent"), to: "/parent" }, { label: tr("parent_dashboard_title") }]}
      >
        <EmailVerificationRequired email={unverifiedEmail} />
      </PageShell>
    );
  }

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
        eyebrow={tr("nav_parent")}
        title={tr("parent_dashboard_title")}
        lead={tr("checking_access")}
        crumbs={[{ label: tr("nav_parent"), to: "/parent" }, { label: tr("dashboard_label") }]}
      >
        <div className="text-sm text-muted-foreground">{tr("verifying_access")}</div>
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

      if (isInitial) {
        await redeemPendingParentLinkCodeFromMetadata();
      }

      const bundle = await fetchParentDashboardBundle(userId, studentUserId, { lang });

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
    [userId, lang],
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

  async function signOut() {
    await supabase.auth.signOut();
    toast.success(tr("signed_out"));
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
          {children.length > 1 ? tr("parent_signed_in_multi") : tr("parent_signed_in_single")}
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
            {tr("sign_out")}
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
          {tr("parent_link_none_error")}
          <div className="mt-3">
            <Link
              to="/parent/settings"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {tr("parent_add_child_submit")}
            </Link>
          </div>
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {`${tr("parent_dashboard_load_failed")} ${loadError}`}
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
            <ParentDashboardView data={dashboard} />
          )}
        </div>
      ) : null}
    </PageShell>
  );
}

