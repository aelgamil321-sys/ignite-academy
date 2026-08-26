import { Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, L } from "@/lib/i18n";
import { useCMS } from "@/lib/cms";
import {
  assignmentScopeOptionsForGrade,
  fetchTeacherContext,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import {
  createAssignment,
  updateAssignment,
  type AssignmentRow,
  type AssignmentSaveInput,
} from "@/lib/assignment";
import {
  ASSIGNMENT_ATTACHMENT_ACCEPT,
  uploadAssignmentAttachment,
} from "@/lib/assignment-upload";
import { syncAssignmentPublishNotifications } from "@/lib/notifications";
import { formatError } from "@/lib/upload";
import {
  islamicGroupLabel,
  sectionLabel,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";

const emptyForm = (grade: string): AssignmentSaveInput => ({
  title_en: "",
  title_ar: "",
  instructions_en: "",
  instructions_ar: "",
  grade,
  section: null,
  islamic_group: null,
  lesson_id: null,
  due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  max_points: 100,
  published: false,
});

export function TeacherAssignmentForm({
  context,
  editing,
  onSaved,
  onCancel,
}: {
  context: TeacherContext;
  editing: AssignmentRow | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { lang, bi, tr } = useI18n();
  const { lessons } = useCMS();
  const defaultGrade = context.assignedGrades[0] ?? "8";
  const [form, setForm] = useState<AssignmentSaveInput>(
    editing
      ? {
          title_en: editing.title_en,
          title_ar: editing.title_ar,
          instructions_en: editing.instructions_en,
          instructions_ar: editing.instructions_ar,
          grade: editing.grade,
          section: editing.section,
          islamic_group: editing.islamic_group,
          lesson_id: editing.lesson_id,
          due_date: editing.due_date.slice(0, 16),
          max_points: editing.max_points,
          published: editing.published,
          attachment_path: editing.attachment_path,
          attachment_name: editing.attachment_name,
          attachment_mime: editing.attachment_mime,
        }
      : emptyForm(defaultGrade),
  );
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const scopeOpts = useMemo(
    () => assignmentScopeOptionsForGrade(context, form.grade),
    [context, form.grade],
  );

  const scopedLessons = lessons.filter((l) => l.grade === form.grade);

  const save = async () => {
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

      let assignmentId = editing?.id;

      if (editing) {
        const { error } = await updateAssignment(editing.id, payload);
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

      if (payload.published && assignmentId) {
        await syncAssignmentPublishNotifications(assignmentId);
      }

      toast.success(tr("teacher_assignment_saved"));
      onSaved();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h3 className="font-display text-lg">
        {editing ? tr("teacher_edit_assignment") : tr("teacher_create_assignment")}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            {L("Title (EN)", "العنوان (إنجليزي)")[lang]}
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            value={form.title_en}
            onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            {L("Title (AR)", "العنوان (عربي)")[lang]}
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            dir="rtl"
            value={form.title_ar}
            onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("teacher_field_grade")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            value={form.grade}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                grade: e.target.value,
                section: null,
                islamic_group: null,
                lesson_id: null,
              }))
            }
          >
            {context.assignedGrades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("teacher_field_section")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            value={form.section ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                section: (e.target.value || null) as StudentSection | null,
              }))
            }
          >
            {scopeOpts.sections.map((s) => (
              <option key={s ?? "all"} value={s ?? ""}>
                {s ? sectionLabel(s, lang) : tr("teacher_all_sections")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("teacher_field_islamic_group")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            value={form.islamic_group ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                islamic_group: (e.target.value || null) as IslamicGroup | null,
              }))
            }
          >
            {scopeOpts.groups.map((g) => (
              <option key={g ?? "all"} value={g ?? ""}>
                {g ? islamicGroupLabel(g, lang) : tr("teacher_all_groups")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{L("Due date", "تاريخ التسليم")[lang]}</span>
        <input
          type="datetime-local"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          value={form.due_date}
          onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{L("Lesson link", "ربط الدرس")[lang]}</span>
        <select
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          value={form.lesson_id ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, lesson_id: e.target.value || null }))}
        >
          <option value="">{L("— None —", "— لا شيء —")[lang]}</option>
          {scopedLessons.map((l) => (
            <option key={l.id} value={l.id}>{bi(l.title)}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{L("Attachment", "ملف مرفق")[lang]}</span>
        <input
          type="file"
          accept={ASSIGNMENT_ATTACHMENT_ACCEPT}
          className="mt-1 w-full"
          onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
        />
        {tr("teacher_publish")}
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {tr("teacher_save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          {tr("teacher_cancel")}
        </button>
      </div>
    </div>
  );
}

export function useTeacherAssignmentContext() {
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoading(false);
        return;
      }
      const ctx = await fetchTeacherContext(data.user.id);
      setContext(ctx);
      setLoading(false);
    })();
  }, []);

  return { context, loading };
}
