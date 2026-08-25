import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, School, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName } from "@/lib/grade-utils";
import { localeForFormatting, type Lang } from "@/lib/i18n-config";
import { useI18n, L } from "@/lib/i18n";
import { formatError } from "@/lib/upload";
import {
  addTeacherAssignment,
  fetchAdminTeachers,
  fetchRegisteredUserOptions,
  findRegisteredUserByEmail,
  grantTeacherRole,
  removeTeacherAssignment,
  revokeTeacherRole,
  setTeacherLeadStatus,
  updateTeacherAssignment,
  type AdminTeacherRow,
  type RegisteredUserOption,
  type TeacherAssignmentInput,
  type TeacherAssignmentRow,
} from "@/lib/admin-teachers";
import {
  approveTeacherRequest,
  fetchPendingTeacherRequests,
  rejectTeacherRequest,
  type TeacherRequestRow,
} from "@/lib/teacher-requests";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  islamicGroupLabel,
  normalizeIslamicGroup,
  normalizeStudentSection,
  sectionLabel,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";

const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

function formatRequestDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(localeForFormatting(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export const Route = createFileRoute("/admin/teachers/")({
  head: () => ({
    meta: [
      { title: "Teachers — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminTeachersPage,
});

type AssignmentFormState = {
  grade: string;
  section: "" | StudentSection;
  islamic_group: "" | IslamicGroup;
};

const EMPTY_ASSIGNMENT_FORM: AssignmentFormState = {
  grade: grades[0]?.slug ?? "8",
  section: "",
  islamic_group: "",
};

function assignmentInputFromForm(form: AssignmentFormState): TeacherAssignmentInput {
  return {
    grade: form.grade,
    section: form.section ? normalizeStudentSection(form.section) : null,
    islamic_group: form.islamic_group ? normalizeIslamicGroup(form.islamic_group) : null,
  };
}

function formFromAssignment(row: TeacherAssignmentRow): AssignmentFormState {
  return {
    grade: row.grade,
    section: (normalizeStudentSection(row.section) ?? "") as "" | StudentSection,
    islamic_group: (normalizeIslamicGroup(row.islamic_group) ?? "") as "" | IslamicGroup,
  };
}

function formatAssignmentScope(
  row: TeacherAssignmentRow,
  lang: "en" | "ar",
): string {
  const gradeLabel = gradeDisplayName(row.grade, lang);
  const sectionText = row.section
    ? sectionLabel(normalizeStudentSection(row.section), lang)
    : L("All sections", "كل الشعب")[lang];
  const groupText = row.islamic_group
    ? islamicGroupLabel(normalizeIslamicGroup(row.islamic_group), lang)
    : L("Both Islamic groups", "كلا المجموعتين الإسلامية")[lang];
  return `${gradeLabel} · ${sectionText} · ${groupText}`;
}

function AssignmentFormFields({
  form,
  onChange,
  lang,
}: {
  form: AssignmentFormState;
  onChange: (next: AssignmentFormState) => void;
  lang: "en" | "ar";
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {L("Grade", "الصف")[lang]}
        </span>
        <select
          className={selectClass}
          value={form.grade}
          onChange={(e) => onChange({ ...form, grade: e.target.value })}
        >
          {grades.map((g) => (
            <option key={g.slug} value={g.slug}>
              {L(g.name.en, g.name.ar)[lang]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {L("Section", "الشعبة")[lang]}
        </span>
        <select
          className={selectClass}
          value={form.section}
          onChange={(e) =>
            onChange({
              ...form,
              section: e.target.value as AssignmentFormState["section"],
            })
          }
        >
          <option value="">{L("All sections", "كل الشعب")[lang]}</option>
          {STUDENT_SECTIONS.map((section) => (
            <option key={section} value={section}>
              {sectionLabel(section, lang)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {L("Islamic group", "المجموعة الإسلامية")[lang]}
        </span>
        <select
          className={selectClass}
          value={form.islamic_group}
          onChange={(e) =>
            onChange({
              ...form,
              islamic_group: e.target.value as AssignmentFormState["islamic_group"],
            })
          }
        >
          <option value="">{L("Both Islamic groups", "كلا المجموعتين الإسلامية")[lang]}</option>
          {ISLAMIC_GROUPS.map((group) => (
            <option key={group} value={group}>
              {islamicGroupLabel(group, lang)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TeacherAssignmentEditor({
  assignment,
  lang,
  onSaved,
  onCancel,
}: {
  assignment: TeacherAssignmentRow;
  lang: "en" | "ar";
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AssignmentFormState>(() => formFromAssignment(assignment));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateTeacherAssignment(assignment.id, assignmentInputFromForm(form));
      toast.success(L("Assignment updated.", "تم تحديث التكليف.")[lang]);
      onSaved();
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <AssignmentFormFields form={form} onChange={setForm} lang={lang} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
          {L("Save", "حفظ")[lang]}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
          {L("Cancel", "إلغاء")[lang]}
        </button>
      </div>
    </div>
  );
}

function TeacherCard({
  teacher,
  lang,
  onRefresh,
}: {
  teacher: AdminTeacherRow;
  lang: "en" | "ar";
  onRefresh: () => Promise<void>;
}) {
  const [addForm, setAddForm] = useState<AssignmentFormState>(EMPTY_ASSIGNMENT_FORM);
  const [adding, setAdding] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leadUpdating, setLeadUpdating] = useState(false);

  const addAssignment = async () => {
    setAdding(true);
    try {
      await addTeacherAssignment(teacher.userId, assignmentInputFromForm(addForm));
      toast.success(L("Assignment added.", "تمت إضافة التكليف.")[lang]);
      setAddForm(EMPTY_ASSIGNMENT_FORM);
      await onRefresh();
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setAdding(false);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      await removeTeacherAssignment(assignmentId);
      toast.success(L("Assignment removed.", "تمت إزالة التكليف.")[lang]);
      if (editingId === assignmentId) setEditingId(null);
      await onRefresh();
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  const revokeTeacher = async () => {
    setRevoking(true);
    try {
      await revokeTeacherRole(teacher.userId);
      toast.success(L("Teacher role removed.", "تمت إزالة صلاحية المعلم.")[lang]);
      await onRefresh();
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setRevoking(false);
    }
  };

  const toggleLeadTeacher = async () => {
    setLeadUpdating(true);
    try {
      await setTeacherLeadStatus(teacher.userId, !teacher.isLeadTeacher);
      toast.success(
        teacher.isLeadTeacher
          ? L("Lead Teacher permission removed.", "تمت إزالة صلاحية مسؤول القسم.")[lang]
          : L("Lead Teacher permission granted.", "تم منح صلاحية مسؤول القسم.")[lang],
      );
      await onRefresh();
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setLeadUpdating(false);
    }
  };

  const statusLabel =
    teacher.status === "active"
      ? L("Active", "نشط")[lang]
      : L("No assignments", "بدون تكليفات")[lang];

  const statusClass =
    teacher.status === "active"
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-border bg-muted text-muted-foreground";

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground">{teacher.fullName}</h3>
          <p className="text-sm text-muted-foreground">{teacher.email || "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {teacher.isLeadTeacher && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {L("Lead Teacher / مسؤول القسم", "مسؤول القسم / Lead Teacher")[lang]}
            </span>
          )}
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            disabled={leadUpdating}
            onClick={() => void toggleLeadTeacher()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            {leadUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {teacher.isLeadTeacher
              ? L("Remove Lead Teacher", "إزالة مسؤول القسم")[lang]
              : L("Lead Teacher / مسؤول القسم", "مسؤول القسم / Lead Teacher")[lang]}
          </button>
          <button
            type="button"
            disabled={revoking}
            onClick={() => void revokeTeacher()}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            {revoking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {L("Remove teacher", "إزالة المعلم")[lang]}
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {L("Teaching assignments", "تكليفات التدريس")[lang]}
        </h4>
        {teacher.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {L("No grade assignments yet.", "لا توجد تكليفات صفوف بعد.")[lang]}
          </p>
        ) : (
          <ul className="space-y-2">
            {teacher.assignments.map((assignment) => (
              <li key={assignment.id}>
                {editingId === assignment.id ? (
                  <TeacherAssignmentEditor
                    assignment={assignment}
                    lang={lang}
                    onSaved={() => {
                      setEditingId(null);
                      void onRefresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                    <span className="flex-1 min-w-0 text-sm text-foreground">
                      {formatAssignmentScope(assignment, lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingId(assignment.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {L("Edit", "تعديل")[lang]}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeAssignment(assignment.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {L("Remove", "إزالة")[lang]}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          {L("Add assignment", "إضافة تكليف")[lang]}
        </h4>
        <AssignmentFormFields form={addForm} onChange={setAddForm} lang={lang} />
        <button
          type="button"
          disabled={adding}
          onClick={() => void addAssignment()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {L("Add assignment", "إضافة تكليف")[lang]}
        </button>
      </div>
    </article>
  );
}

function AdminTeachersPage() {
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<AdminTeacherRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeacherRequestRow[]>([]);
  const [userOptions, setUserOptions] = useState<RegisteredUserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [granting, setGranting] = useState(false);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teacherRows, options, requests] = await Promise.all([
        fetchAdminTeachers(),
        fetchRegisteredUserOptions(),
        fetchPendingTeacherRequests(),
      ]);
      setTeachers(teacherRows);
      setUserOptions(options);
      setPendingRequests(requests);
      setSelectedUserId((prev) => prev || options[0]?.userId || "");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const grantTeacher = async (userId: string) => {
    if (currentUserId && userId === currentUserId) {
      toast.error(L("You cannot assign the teacher role to yourself.", "لا يمكنك تعيين نفسك كمعلم.")[lang]);
      return;
    }
    setGranting(true);
    try {
      await grantTeacherRole(userId);
      toast.success(L("Teacher role granted.", "تم منح صلاحية المعلم.")[lang]);
      setPromoteEmail("");
      await load();
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setGranting(false);
    }
  };

  const grantByEmail = async () => {
    const match = findRegisteredUserByEmail(promoteEmail, userOptions);
    if (!match) {
      toast.error(L("User not found", "المستخدم غير موجود")[lang]);
      return;
    }
    await grantTeacher(match.userId);
  };

  const grantSelected = async () => {
    if (!selectedUserId) {
      toast.error(L("Select a registered user.", "اختر مستخدمًا مسجّلًا.")[lang]);
      return;
    }
    await grantTeacher(selectedUserId);
  };

  const approveRequest = async (requestId: string) => {
    setRequestActionId(requestId);
    try {
      await approveTeacherRequest(requestId);
      toast.success(tr("admin_teacher_request_approved"));
      await load();
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setRequestActionId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setRequestActionId(requestId);
    try {
      await rejectTeacherRequest(requestId);
      toast.success(tr("admin_teacher_request_rejected"));
      await load();
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setRequestActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl text-foreground">
            {tr("admin_teacher_requests_title")}
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {L("Loading…", "جارٍ التحميل…")[lang]}
          </div>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {tr("admin_teacher_requests_empty")}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 pe-4 font-medium">{L("Teacher", "المعلم")[lang]}</th>
                  <th className="pb-3 pe-4 font-medium">{L("Email", "البريد")[lang]}</th>
                  <th className="pb-3 pe-4 font-medium">{tr("admin_teacher_request_date")}</th>
                  <th className="pb-3 font-medium">{L("Status", "الحالة")[lang]}</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request) => {
                  const acting = requestActionId === request.id;
                  return (
                    <tr key={request.id} className="border-b border-border/70 last:border-0 align-top">
                      <td className="py-3 pe-4 font-medium text-foreground">{request.full_name}</td>
                      <td className="py-3 pe-4 text-muted-foreground">{request.email || "—"}</td>
                      <td className="py-3 pe-4 text-muted-foreground">
                        {formatRequestDate(request.created_at, lang)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => void approveRequest(request.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
                          >
                            {acting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {tr("admin_teacher_approve")}
                          </button>
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => void rejectRequest(request.id)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                          >
                            <X className="h-3.5 w-3.5" />
                            {tr("admin_teacher_reject")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <School className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl text-foreground">
            {L("Add teacher", "إضافة معلم")[lang]}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {L(
            "Select an existing registered user and grant the teacher role. Teachers cannot assign themselves.",
            "اختر مستخدمًا مسجّلًا وامنحه صلاحية المعلم. لا يمكن للمعلمين تعيين أنفسهم.",
          )[lang]}
        </p>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {L("Registered user", "مستخدم مسجّل")[lang]}
            </span>
            <select
              className={selectClass}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={userOptions.length === 0}
            >
              {userOptions.length === 0 ? (
                <option value="">
                  {L("No eligible users", "لا يوجد مستخدمين مؤهلون")[lang]}
                </option>
              ) : (
                userOptions.map((option) => (
                  <option key={option.userId} value={option.userId}>
                    {option.fullName} ({option.email})
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="button"
            disabled={granting || !selectedUserId}
            onClick={() => void grantSelected()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {L("Grant teacher role", "منح صلاحية المعلم")[lang]}
          </button>
          <div className="flex flex-wrap gap-2 items-end border-t border-border pt-4">
            <label className="flex-1 min-w-[200px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {L("Or search by email", "أو ابحث بالبريد الإلكتروني")[lang]}
              </span>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                placeholder={L("User email", "البريد الإلكتروني")[lang]}
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={granting || !promoteEmail.trim()}
              onClick={() => void grantByEmail()}
              className="rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              {L("Grant by email", "منح بالبريد")[lang]}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-xl text-foreground mb-4">
          {L("Teachers", "المعلمون")[lang]}
        </h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {L("Loading…", "جارٍ التحميل…")[lang]}
          </div>
        ) : teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {L("No teachers yet.", "لا يوجد معلمون بعد.")[lang]}
          </p>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto -mx-1 mb-6">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 pe-4 font-medium">{L("Teacher", "المعلم")[lang]}</th>
                    <th className="pb-3 pe-4 font-medium">{L("Email", "البريد")[lang]}</th>
                    <th className="pb-3 pe-4 font-medium">{L("Assignments", "التكليفات")[lang]}</th>
                    <th className="pb-3 font-medium">{L("Status", "الحالة")[lang]}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.userId} className="border-b border-border/70 last:border-0 align-top">
                      <td className="py-3 pe-4 font-medium text-foreground">{teacher.fullName}</td>
                      <td className="py-3 pe-4 text-muted-foreground">{teacher.email || "—"}</td>
                      <td className="py-3 pe-4 text-foreground">
                        {teacher.assignments.length === 0
                          ? L("None", "لا يوجد")[lang]
                          : teacher.assignments.map((a) => formatAssignmentScope(a, lang)).join(" · ")}
                      </td>
                      <td className="py-3 text-foreground">
                        {teacher.status === "active"
                          ? L("Active", "نشط")[lang]
                          : L("No assignments", "بدون تكليفات")[lang]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              {teachers.map((teacher) => (
                <TeacherCard key={teacher.userId} teacher={teacher} lang={lang} onRefresh={load} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
