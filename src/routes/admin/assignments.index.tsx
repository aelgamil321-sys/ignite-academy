import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCMS } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import {
  assignmentTitle,
  computeAssignmentAnalytics,
  createAssignment,
  deleteAssignment,
  fetchAllAssignmentsAdmin,
  fetchAllSubmissionsAdmin,
  gradeAssignmentSubmission,
  statusBadgeClass,
  updateAssignment,
  type AssignmentRow,
  type AssignmentSaveInput,
  type AssignmentSubmissionRow,
  type AssignmentSubmissionStatus,
} from "@/lib/assignment";
import { AdminAssignmentSubmissionFile } from "@/components/admin-assignment-submission-file";
import {
  deleteAssignmentStorageFile,
  uploadAssignmentAttachment,
} from "@/lib/assignment-upload";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  formatStudentAcademics,
  normalizeIslamicGroup,
  normalizeStudentSection,
} from "@/lib/student-academics";
import { formatError } from "@/lib/upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  grade: string | null;
  section: string | null;
  islamic_group: string | null;
};

const emptyForm = (): AssignmentSaveInput => ({
  title_en: "",
  title_ar: "",
  instructions_en: "",
  instructions_ar: "",
  grade: "8",
  section: null,
  islamic_group: null,
  lesson_id: null,
  due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  max_points: 100,
  published: false,
});

export const Route = createFileRoute("/admin/assignments/")({
  head: () => ({
    meta: [
      { title: "Assignments Management — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAssignmentsPage,
});

function AdminAssignmentsPage() {
  const { lang, bi } = useI18n();
  const { lessons } = useCMS();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"assignments" | "submissions">("assignments");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentSaveInput>(emptyForm());
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [gradeDraft, setGradeDraft] = useState<Record<string, { score: string; feedbackEn: string; feedbackAr: string }>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);

  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterLesson, setFilterLesson] = useState("all");
  const [filterStatus, setFilterStatus] = useState<AssignmentSubmissionStatus | "all">("all");

  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, sRes, pRes] = await Promise.all([
      fetchAllAssignmentsAdmin(),
      fetchAllSubmissionsAdmin(),
      supabase.from("profiles").select("user_id, email, full_name, grade, section, islamic_group"),
    ]);
    if (aRes.error) toast.error(aRes.error);
    else setAssignments(aRes.data);
    if (sRes.error) toast.error(sRes.error);
    else setSubmissions(sRes.data);
    if (!pRes.error && pRes.data) {
      setProfiles(new Map(pRes.data.map((p) => [p.user_id, p as ProfileRow])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const analytics = useMemo(
    () =>
      computeAssignmentAnalytics(
        assignments,
        submissions,
        [...profiles.values()],
        {
          grade: filterGrade,
          section: filterSection,
          islamicGroup: filterGroup,
          lessonId: filterLesson,
          status: filterStatus,
        },
      ),
    [assignments, submissions, profiles, filterGrade, filterSection, filterGroup, filterLesson, filterStatus],
  );

  const assignmentMap = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const a = assignmentMap.get(s.assignment_id);
      if (!a) return false;
      if (filterGrade !== "all" && a.grade !== filterGrade) return false;
      if (filterSection !== "all" && a.section !== filterSection) return false;
      if (filterGroup !== "all" && a.islamic_group !== filterGroup) return false;
      if (filterLesson !== "all" && a.lesson_id !== filterLesson) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      return true;
    });
  }, [submissions, assignmentMap, filterGrade, filterSection, filterGroup, filterLesson, filterStatus]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setAttachmentFile(null);
    setShowForm(true);
  }

  function openEdit(row: AssignmentRow) {
    setEditingId(row.id);
    setForm({
      title_en: row.title_en,
      title_ar: row.title_ar,
      instructions_en: row.instructions_en,
      instructions_ar: row.instructions_ar,
      grade: row.grade,
      section: row.section,
      islamic_group: row.islamic_group,
      lesson_id: row.lesson_id,
      due_date: row.due_date.slice(0, 16),
      max_points: row.max_points,
      published: row.published,
      attachment_path: row.attachment_path,
      attachment_name: row.attachment_name,
      attachment_mime: row.attachment_mime,
    });
    setAttachmentFile(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title_en.trim() || !form.title_ar.trim()) {
      toast.error(L("Title (EN & AR) required", "العنوان (إنجليزي وعربي) مطلوب")[lang]);
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");

      const payload: AssignmentSaveInput = {
        ...form,
        due_date: new Date(form.due_date).toISOString(),
        section: form.section || null,
        islamic_group: form.islamic_group || null,
        lesson_id: form.lesson_id || null,
      };

      let assignmentId = editingId;

      if (editingId) {
        const { error } = await updateAssignment(editingId, payload);
        if (error) throw new Error(error);
      } else {
        const { data, error } = await createAssignment(payload, auth.user.id);
        if (error || !data) throw new Error(error ?? "Create failed");
        assignmentId = data.id;
      }

      if (attachmentFile && assignmentId) {
        const uploaded = await uploadAssignmentAttachment(assignmentId, attachmentFile);
        const { error } = await updateAssignment(assignmentId, {
          attachment_path: uploaded.path,
          attachment_name: uploaded.name,
          attachment_mime: uploaded.mime,
        });
        if (error) throw new Error(error);
      }

      toast.success(L("Assignment saved", "تم حفظ الواجب")[lang]);
      setShowForm(false);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const row = assignments.find((a) => a.id === deleteId);
    try {
      if (row?.attachment_path) {
        await deleteAssignmentStorageFile(row.attachment_path).catch(() => undefined);
      }
      const { error } = await deleteAssignment(deleteId);
      if (error) throw new Error(error);
      toast.success(L("Assignment deleted", "تم حذف الواجب")[lang]);
      setDeleteId(null);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  async function handleGrade(sub: AssignmentSubmissionRow) {
    const draft = gradeDraft[sub.id] ?? {
      score: String(sub.score ?? ""),
      feedbackEn: sub.feedback_en ?? "",
      feedbackAr: sub.feedback_ar ?? "",
    };
    const score = Number(draft.score);
    const assignment = assignmentMap.get(sub.assignment_id);
    const maxPoints = assignment?.max_points ?? sub.max_points ?? 100;
    if (Number.isNaN(score) || score < 0 || score > maxPoints) {
      toast.error(L("Invalid score", "درجة غير صالحة")[lang]);
      return;
    }

    setGradingId(sub.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { error } = await gradeAssignmentSubmission({
        submissionId: sub.id,
        score,
        maxPoints,
        feedbackEn: draft.feedbackEn,
        feedbackAr: draft.feedbackAr,
        gradedBy: auth.user.id,
      });
      if (error) throw new Error(error);
      toast.success(L("Submission graded", "تم تقييم الإرسال")[lang]);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setGradingId(null);
    }
  }

  const filterBar = (
    <div className="flex flex-wrap gap-2">
      <select
        value={filterGrade}
        onChange={(e) => setFilterGrade(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        <option value="all">{L("All grades", "كل الصفوف")[lang]}</option>
        {grades.map((g) => (
          <option key={g.slug} value={g.slug}>
            {bi(g.name)}
          </option>
        ))}
      </select>
      <select
        value={filterSection}
        onChange={(e) => setFilterSection(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        <option value="all">{L("All sections", "كل الشعب")[lang]}</option>
        {STUDENT_SECTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={filterGroup}
        onChange={(e) => setFilterGroup(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        <option value="all">{L("All Islamic groups", "كل المجموعات")[lang]}</option>
        {ISLAMIC_GROUPS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select
        value={filterLesson}
        onChange={(e) => setFilterLesson(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm min-w-[140px]"
      >
        <option value="all">{L("All lessons", "كل الدروس")[lang]}</option>
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            {bi(l.title) || l.title.en}
          </option>
        ))}
      </select>
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value as AssignmentSubmissionStatus | "all")}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        <option value="all">{L("All statuses", "كل الحالات")[lang]}</option>
        <option value="submitted">{L("Submitted", "مُرسل")[lang]}</option>
        <option value="late">{L("Late", "متأخر")[lang]}</option>
        <option value="graded">{L("Graded", "مُقيّم")[lang]}</option>
        <option value="missing">{L("Missing", "ناقص")[lang]}</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-foreground">
            {L("Assignments Management", "إدارة الواجبات")[lang]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {L(
              "Create assignments, review submissions, and grade student work.",
              "أنشئ الواجبات وراجع الإرسالات وقيّم أعمال الطلاب.",
            )[lang]}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {L("Create assignment", "إنشاء واجب")[lang]}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { label: L("Total", "الإجمالي")[lang], value: analytics.total },
          { label: L("Submitted", "مُرسل")[lang], value: analytics.submitted },
          { label: L("Missing", "ناقص")[lang], value: analytics.missing },
          { label: L("Late", "متأخر")[lang], value: analytics.late },
          { label: L("Graded", "مُقيّم")[lang], value: analytics.graded },
          { label: L("Completion %", "نسبة الإنجاز")[lang], value: `${analytics.completionPct}%` },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-display text-foreground">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {(analytics.byGrade.length > 0 || analytics.bySection.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: L("By grade", "حسب الصف")[lang], rows: analytics.byGrade },
            { title: L("By section", "حسب الشعبة")[lang], rows: analytics.bySection },
            { title: L("By Islamic group", "حسب المجموعة")[lang], rows: analytics.byIslamicGroup },
          ].map((block) => (
            <div key={block.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">{block.title}</h3>
              {block.rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {block.rows.map((r) => (
                    <li key={r.key} className="flex justify-between gap-2">
                      <span>{r.key}</span>
                      <span className="font-semibold text-primary">{r.pct}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {filterBar}

      <div className="flex gap-2 border-b border-border">
        {(["assignments", "submissions"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              view === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "assignments"
              ? L("Assignments", "الواجبات")[lang]
              : L("Submissions", "الإرسالات")[lang]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {L("Loading…", "جارٍ التحميل…")[lang]}
        </p>
      ) : view === "assignments" ? (
        assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {L("No assignments yet.", "لا توجد واجبات بعد.")[lang]}
          </p>
        ) : (
          <ul className="space-y-3">
            {assignments.map((row) => (
              <li key={row.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 justify-between">
                <div className="min-w-0">
                  <div className="font-medium">{bi(assignmentTitle(row))}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {L("Grade", "الصف")[lang]} {row.grade}
                    {row.section ? ` · ${row.section}` : ""}
                    {row.islamic_group ? ` · ${row.islamic_group}` : ""}
                    {" · "}
                    {new Date(row.due_date).toLocaleString(lang === "ar" ? "ar" : "en")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs rounded-full px-2 py-1 font-semibold ${
                      row.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.published ? L("Published", "منشور")[lang] : L("Draft", "مسودة")[lang]}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
                  >
                    {L("Edit", "تعديل")[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(row.id)}
                    className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : filteredSubmissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {L("No submissions match filters.", "لا توجد إرسالات تطابق الفلاتر.")[lang]}
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredSubmissions.map((sub) => {
            const assignment = assignmentMap.get(sub.assignment_id);
            const profile = profiles.get(sub.student_id);
            const expanded = expandedSubId === sub.id;
            const draft = gradeDraft[sub.id] ?? {
              score: String(sub.score ?? ""),
              feedbackEn: sub.feedback_en ?? "",
              feedbackAr: sub.feedback_ar ?? "",
            };

            return (
              <li key={sub.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSubId(expanded ? null : sub.id)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-start hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {assignment ? bi(assignmentTitle(assignment)) : sub.assignment_id}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {profile?.full_name || profile?.email || sub.student_id}
                      {profile?.grade ? ` · ${profile.grade}` : ""}
                      {(profile?.section || profile?.islamic_group) && (
                        <span>
                          {" · "}
                          {formatStudentAcademics(
                            {
                              section: normalizeStudentSection(profile.section),
                              islamic_group: normalizeIslamicGroup(profile.islamic_group),
                            },
                            lang,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs rounded-full px-2.5 py-1 font-semibold ${statusBadgeClass(sub.status)}`}>
                      {sub.status}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                    {sub.text_response && (
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                          {L("Text answer", "الإجابة النصية")[lang]}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{sub.text_response}</p>
                      </div>
                    )}
                    {sub.file_path || sub.file_name ? (
                      <AdminAssignmentSubmissionFile
                        filePath={sub.file_path}
                        fileName={sub.file_name}
                        fileMime={sub.file_mime}
                      />
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-xs font-medium">{L("Score", "الدرجة")[lang]}</label>
                        <input
                          type="number"
                          min={0}
                          max={assignment?.max_points ?? 100}
                          value={draft.score}
                          onChange={(e) =>
                            setGradeDraft((prev) => ({
                              ...prev,
                              [sub.id]: { ...draft, score: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium">{L("Feedback (EN)", "ملاحظات (إنجليزي)")[lang]}</label>
                        <textarea
                          rows={2}
                          value={draft.feedbackEn}
                          onChange={(e) =>
                            setGradeDraft((prev) => ({
                              ...prev,
                              [sub.id]: { ...draft, feedbackEn: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-xs font-medium">{L("Feedback (AR)", "ملاحظات (عربي)")[lang]}</label>
                        <textarea
                          rows={2}
                          value={draft.feedbackAr}
                          onChange={(e) =>
                            setGradeDraft((prev) => ({
                              ...prev,
                              [sub.id]: { ...draft, feedbackAr: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                          dir="rtl"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={gradingId === sub.id}
                      onClick={() => void handleGrade(sub)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {gradingId === sub.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {L("Save grade", "حفظ الدرجة")[lang]}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 md:p-6 shadow-xl space-y-4">
            <h2 className="font-display text-xl">
              {editingId
                ? L("Edit assignment", "تعديل الواجب")[lang]
                : L("Create assignment", "إنشاء واجب")[lang]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">{L("Title (EN)", "العنوان (إنجليزي)")[lang]}</label>
                <input
                  value={form.title_en}
                  onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">{L("Title (AR)", "العنوان (عربي)")[lang]}</label>
                <input
                  value={form.title_ar}
                  onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  dir="rtl"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{L("Instructions (EN)", "التعليمات (إنجليزي)")[lang]}</label>
              <textarea
                rows={3}
                value={form.instructions_en}
                onChange={(e) => setForm((f) => ({ ...f, instructions_en: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">{L("Instructions (AR)", "التعليمات (عربي)")[lang]}</label>
              <textarea
                rows={3}
                value={form.instructions_ar}
                onChange={(e) => setForm((f) => ({ ...f, instructions_ar: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                dir="rtl"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-medium">{L("Grade", "الصف")[lang]}</label>
                <select
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  {grades.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {bi(g.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{L("Section", "الشعبة")[lang]}</label>
                <select
                  value={form.section ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      section: e.target.value ? normalizeStudentSection(e.target.value) : null,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">{L("Any", "أي")[lang]}</option>
                  {STUDENT_SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{L("Islamic group", "المجموعة")[lang]}</label>
                <select
                  value={form.islamic_group ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      islamic_group: e.target.value ? normalizeIslamicGroup(e.target.value) : null,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">{L("Any", "أي")[lang]}</option>
                  {ISLAMIC_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{L("Max points", "الدرجة الكاملة")[lang]}</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_points}
                  onChange={(e) => setForm((f) => ({ ...f, max_points: Number(e.target.value) || 100 }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">{L("Due date", "تاريخ التسليم")[lang]}</label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">{L("Related lesson", "الدرس المرتبط")[lang]}</label>
                <select
                  value={form.lesson_id ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, lesson_id: e.target.value || null }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">{L("None", "لا يوجد")[lang]}</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {bi(l.title) || l.title.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{L("Attachment", "مرفق")[lang]}</label>
              <input
                type="file"
                accept={ASSIGNMENT_ATTACHMENT_ACCEPT}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
              {form.attachment_name && !attachmentFile && (
                <p className="text-xs text-muted-foreground mt-1">{form.attachment_name}</p>
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              {form.published ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              {L("Published", "منشور")[lang]}
            </label>
            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                {L("Cancel", "إلغاء")[lang]}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {L("Save", "حفظ")[lang]}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L("Delete assignment?", "حذف الواجب؟")[lang]}</AlertDialogTitle>
            <AlertDialogDescription>
              {L("This will remove the assignment and all submissions.", "سيُحذف الواجب وجميع الإرسالات.")[lang]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L("Cancel", "إلغاء")[lang]}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {L("Delete", "حذف")[lang]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
