import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import {
  ADMIN_STUDENT_GRADE_OPTIONS,
  fetchAdminStudentDirectory,
  formatAdminStudentSearchHaystack,
  type AdminStudentDirectoryRow,
} from "@/lib/admin-students";
import { gradeDisplayName } from "@/lib/grade-utils";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  islamicGroupLabel,
  sectionLabel,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import { useI18n, L } from "@/lib/i18n";
import { useSchoolManagementPaths } from "@/lib/workspace-paths";

export const Route = createFileRoute("/admin/students/")({
  head: () => ({
    meta: [
      { title: "Students — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminStudentsPage,
});

export function AdminStudentsPage() {
  const { tr, lang } = useI18n();
  const paths = useSchoolManagementPaths();
  const [rows, setRows] = useState<AdminStudentDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState<StudentSection | "">("");
  const [islamicFilter, setIslamicFilter] = useState<IslamicGroup | "">("");

  useEffect(() => {
    let active = true;
    void fetchAdminStudentDirectory().then((result) => {
      if (!active) return;
      if (result.error) {
        setError(result.error);
        setRows([]);
      } else {
        setRows(result.rows);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (gradeFilter && row.gradeSlug !== gradeFilter) return false;
      if (sectionFilter && row.section !== sectionFilter) return false;
      if (islamicFilter && row.islamicGroup !== islamicFilter) return false;
      if (!needle) return true;
      return formatAdminStudentSearchHaystack(row).includes(needle);
    });
  }, [rows, query, gradeFilter, sectionFilter, islamicFilter]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
        {tr("admin_students_loading")}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-[var(--shadow-soft)] space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("admin_students_search_placeholder")}
            className="w-full rounded-full border border-border bg-background ps-10 pe-4 py-2.5 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{L("Grade", "الصف")[lang]}</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{tr("admin_students_filter_all")}</option>
              {ADMIN_STUDENT_GRADE_OPTIONS.map((slug) => (
                <option key={slug} value={slug}>
                  {gradeDisplayName(slug, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{L("Section", "الشعبة")[lang]}</span>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as StudentSection | "")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{tr("admin_students_filter_all")}</option>
              {STUDENT_SECTIONS.map((section) => (
                <option key={section} value={section}>
                  {sectionLabel(section, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{L("Islamic Group", "المجموعة الإسلامية")[lang]}</span>
            <select
              value={islamicFilter}
              onChange={(e) => setIslamicFilter(e.target.value as IslamicGroup | "")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{tr("admin_students_filter_all")}</option>
              {ISLAMIC_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {islamicGroupLabel(group, lang)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {tr("admin_students_count")}: {filtered.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">{tr("admin_students_empty")}</p>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{L("Student", "الطالب")[lang]}</th>
                  <th className="px-4 py-3 font-semibold">{tr("admin_students_col_id")}</th>
                  <th className="px-4 py-3 font-semibold">{L("Grade", "الصف")[lang]}</th>
                  <th className="px-4 py-3 font-semibold">{L("Section", "الشعبة")[lang]}</th>
                  <th className="px-4 py-3 font-semibold">{L("Islamic Group", "المجموعة الإسلامية")[lang]}</th>
                  <th className="px-4 py-3 font-semibold">{tr("admin_students_col_progress")}</th>
                  <th className="px-4 py-3 font-semibold">{tr("admin_students_col_quiz_avg")}</th>
                  <th className="px-4 py-3 font-semibold">{tr("admin_students_col_certificates")}</th>
                  <th className="px-4 py-3 font-semibold">{tr("admin_students_col_status")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.userId} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        to={paths.studentDetail(row.userId)}
                        className="flex items-center gap-3 min-w-0 group"
                      >
                        <StudentProfileAvatar
                          profilePhotoPath={row.profilePhotoPath}
                          alt={row.fullName}
                          className="h-10 w-10 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground group-hover:text-primary truncate">
                            {row.englishName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" dir="rtl">
                            {row.arabicName}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[10rem] truncate" title={row.userId}>
                      {row.studentLinkCode || row.userId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">{lang === "ar" ? row.gradeLabelAr : row.gradeLabelEn}</td>
                    <td className="px-4 py-3">{sectionLabel(row.section, lang)}</td>
                    <td className="px-4 py-3">{islamicGroupLabel(row.islamicGroup, lang)}</td>
                    <td className="px-4 py-3">{row.progressPct}%</td>
                    <td className="px-4 py-3">
                      {row.averageQuizScorePct === null ? "—" : `${row.averageQuizScorePct}%`}
                    </td>
                    <td className="px-4 py-3">{row.certificatesCount}</td>
                    <td className="px-4 py-3 capitalize">{row.accountRole}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filtered.map((row) => (
              <Link
                key={row.userId}
                to={paths.studentDetail(row.userId)}
                className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <StudentProfileAvatar
                    profilePhotoPath={row.profilePhotoPath}
                    alt={row.fullName}
                    className="h-12 w-12 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{row.englishName}</div>
                    <div className="text-sm text-muted-foreground truncate" dir="rtl">
                      {row.arabicName}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{lang === "ar" ? row.gradeLabelAr : row.gradeLabelEn}</span>
                      <span>{sectionLabel(row.section, lang)}</span>
                      <span>{islamicGroupLabel(row.islamicGroup, lang)}</span>
                      <span>{row.progressPct}% · {row.certificatesCount} {L("Certificates", "شهادات")[lang]}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
