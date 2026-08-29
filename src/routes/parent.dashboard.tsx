import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { ParentDashboardView } from "@/components/parent-dashboard";
import { PARENT_DASHBOARD_UI_PREVIEW } from "@/lib/parent-dashboard-preview-mock";
import { ParentGate } from "@/lib/parent-layout";
import { useI18n } from "@/lib/i18n";
import {
  fetchParentDashboardBundle,
  type ParentDashboardData,
  type ParentLinkedChild,
} from "@/lib/parent-dashboard";
import { storeParentChildId } from "@/lib/parent-children";
import { redeemPendingParentLinkCodeFromMetadata } from "@/lib/parent-link-code";
import { PARENT_NAV_ANCHORS, scrollToParentAnchor } from "@/lib/parent-nav";
import { useParentShell } from "@/lib/parent-shell-context";

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
  component: ParentDashboardRoute,
});

function ParentDashboardRoute() {
  const { uiPreview } = Route.useSearch();
  const { tr } = useI18n();

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

  return (
    <ParentGate>
      <ParentDashboardPage />
    </ParentGate>
  );
}

function ParentDashboardPage() {
  const { userId } = useParentShell();
  const { tr, lang } = useI18n();
  const [children, setChildren] = useState<ParentLinkedChild[]>([]);
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingChild, setSwitchingChild] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [linkError, setLinkError] = useState<"none" | null>(null);

  const sectionHash = useRouterState({
    select: (s) => s.location.hash.replace(/^#/, ""),
  });

  const loadDashboard = useCallback(
    async (studentUserId?: string | null, options?: { initial?: boolean }) => {
      const isInitial = options?.initial ?? false;
      if (isInitial) setLoading(true);
      else setSwitchingChild(true);

      setLoadFailed(false);
      setLinkError(null);

      if (isInitial) {
        await redeemPendingParentLinkCodeFromMetadata();
      }

      const bundle = await fetchParentDashboardBundle(userId, studentUserId, { lang });
      const friendlyError = tr("parent_dashboard_load_error");

      if (bundle.linkError) {
        setLinkError(bundle.linkError);
        setChildren([]);
        setDashboard(null);
        setSelectedStudentUserId(null);
      } else if (bundle.error) {
        if (isInitial) {
          setChildren([]);
          setDashboard(null);
          setSelectedStudentUserId(null);
          setLoadFailed(true);
        } else {
          toast.error(friendlyError);
        }
      } else if (bundle.dashboardError || !bundle.dashboard) {
        if (isInitial) {
          setChildren(bundle.children);
          setDashboard(null);
          setSelectedStudentUserId(null);
          setLoadFailed(true);
        } else {
          toast.error(friendlyError);
        }
      } else {
        setChildren(bundle.children);
        setSelectedStudentUserId(bundle.dashboard.studentUserId);
        setDashboard(bundle.dashboard);
        storeParentChildId(userId, bundle.dashboard.studentUserId);
      }

      if (isInitial) setLoading(false);
      else setSwitchingChild(false);
    },
    [userId, lang, tr],
  );

  useEffect(() => {
    void loadDashboard(undefined, { initial: true });
  }, [loadDashboard]);

  useEffect(() => {
    const anchor = sectionHash;
    if (!anchor || !Object.values(PARENT_NAV_ANCHORS).includes(anchor as (typeof PARENT_NAV_ANCHORS)[keyof typeof PARENT_NAV_ANCHORS])) {
      return;
    }
    if (loading || switchingChild || !dashboard) return;

    if (scrollToParentAnchor(anchor)) return;

    const retryId = window.setInterval(() => {
      if (scrollToParentAnchor(anchor)) window.clearInterval(retryId);
    }, 100);

    return () => window.clearInterval(retryId);
  }, [sectionHash, loading, switchingChild, dashboard]);

  const handleSelectChild = (studentUserId: string) => {
    if (studentUserId === selectedStudentUserId) return;
    void loadDashboard(studentUserId);
  };

  return (
    <div>
      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">
          {tr("parent_dashboard_loading")}
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
      ) : loadFailed ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {tr("parent_dashboard_load_error")}
        </div>
      ) : dashboard && selectedStudentUserId && dashboard.studentUserId === selectedStudentUserId ? (
        switchingChild ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {tr("parent_dashboard_switching")}
          </div>
        ) : (
          <ParentDashboardView
            data={dashboard}
            linkedChildren={children}
            selectedStudentUserId={selectedStudentUserId}
            onSelectChild={handleSelectChild}
          />
        )
      ) : null}
    </div>
  );
}
