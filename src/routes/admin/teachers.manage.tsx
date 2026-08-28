import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AdminTeacherManagement } from "@/components/admin-teacher-management";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/teachers/manage")({
  head: () => ({
    meta: [
      { title: "Manage Teachers — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminTeacherManagePage,
});

function AdminTeacherManagePage() {
  const { tr } = useI18n();

  return (
    <div className="space-y-6">
      <Link
        to="/admin/teachers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        {tr("admin_teachers_back")}
      </Link>
      <AdminTeacherManagement />
    </div>
  );
}
