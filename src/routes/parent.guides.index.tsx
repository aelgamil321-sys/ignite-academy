import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ParentGuideCard } from "@/components/parent-guide-card";
import { ParentWorkspacePageHeader } from "@/components/parent-workspace-page-header";
import { ParentGate } from "@/lib/parent-layout";
import { useI18n } from "@/lib/i18n";
import { useAllParentGuides } from "@/lib/cms";
import { PARENT_DASH_EMPTY } from "@/lib/parent-dashboard-ui";

export const Route = createFileRoute("/parent/guides/")({
  head: () => ({
    meta: [
      { title: "Parent Guides — Parent Workspace" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParentGuidesRoute,
});

function ParentGuidesRoute() {
  return (
    <ParentGate>
      <ParentGuidesPage />
    </ParentGate>
  );
}

function ParentGuidesPage() {
  const { tr } = useI18n();
  const guides = useAllParentGuides();

  return (
    <div>
      <ParentWorkspacePageHeader
        title={tr("parent_nav_guides")}
        lead={tr("parent_workspace_guides_lead")}
      />

      {guides.length === 0 ? (
        <div className={PARENT_DASH_EMPTY}>
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-foreground/45" aria-hidden />
          <span>{tr("parent_workspace_guides_empty")}</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <ParentGuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-foreground/55">
        <Link to="/parent" className="text-primary hover:underline">
          {tr("parent_workspace_public_guides_link")}
        </Link>
      </p>
    </div>
  );
}
