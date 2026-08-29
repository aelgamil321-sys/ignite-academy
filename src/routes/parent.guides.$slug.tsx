import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ParentGuideArticleBody } from "@/components/parent-guide-article-body";
import { ParentWorkspacePageHeader } from "@/components/parent-workspace-page-header";
import { ParentGate } from "@/lib/parent-layout";
import { useI18n } from "@/lib/i18n";
import { useCMS } from "@/lib/cms";
import { resolveParentGuideBySlug } from "@/lib/parent-workspace-content";
import { PARENT_DASH_EMPTY } from "@/lib/parent-dashboard-ui";

export const Route = createFileRoute("/parent/guides/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({
    meta: [
      { title: "Parent Guide — Parent Workspace" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParentGuideDetailRoute,
});

function ParentGuideDetailRoute() {
  return (
    <ParentGate>
      <ParentGuideDetailPage />
    </ParentGate>
  );
}

function ParentGuideDetailPage() {
  const { slug } = Route.useLoaderData();
  const { tr, bi, dir } = useI18n();
  const { articles } = useCMS();
  const guide = resolveParentGuideBySlug(slug, articles);

  if (!guide) {
    return (
      <div>
        <Link
          to="/parent/guides"
          className={`mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ${dir === "rtl" ? "flex-row-reverse" : ""}`}
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {tr("parent_workspace_back_guides")}
        </Link>
        <div className={PARENT_DASH_EMPTY}>
          <span>{tr("guide_not_found")}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/parent/guides"
        className={`mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ${dir === "rtl" ? "flex-row-reverse" : ""}`}
      >
        <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        {tr("parent_workspace_back_guides")}
      </Link>
      <ParentWorkspacePageHeader title={bi(guide.title)} lead={bi(guide.excerpt)} />
      <ParentGuideArticleBody guide={guide} />
    </div>
  );
}
