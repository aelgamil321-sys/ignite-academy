import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, ExternalLink, FileText, Loader2, Upload } from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import { useI18n } from "@/lib/i18n";
import { useTeacherShell } from "@/lib/teacher-shell-context";
import {
  fetchTeacherTimetable,
  getTeacherTimetableSignedUrl,
  TEACHER_TIMETABLE_ACCEPT,
  type TeacherTimetableRecord,
} from "@/lib/teacher-timetable";

export function TeacherTimetableWidget() {
  const { tr } = useI18n();
  const { context } = useTeacherShell();
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<TeacherTimetableRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!context?.userId) return;
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const record = await fetchTeacherTimetable();
        if (!active) return;
        setTimetable(record);
        if (record) {
          const url = await getTeacherTimetableSignedUrl(record.storagePath);
          if (active) setPreviewUrl(url);
        } else {
          setPreviewUrl(null);
        }
      } catch {
        if (active) {
          setTimetable(null);
          setPreviewUrl(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [context?.userId]);

  if (loading) {
    return (
      <TeacherDashboardSection
        title={tr("teacher_dash_schedule_title")}
        icon={<CalendarClock className="h-5 w-5" />}
      >
        <div className="flex min-h-[120px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
        </div>
      </TeacherDashboardSection>
    );
  }

  if (!timetable) {
    return (
      <TeacherDashboardSection
        title={tr("teacher_dash_schedule_title")}
        icon={<CalendarClock className="h-5 w-5" />}
      >
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
          <CalendarClock className="mx-auto mb-2 h-8 w-8 text-brand-dark/60" />
          <p className="text-sm text-muted-foreground">{tr("teacher_timetable_empty")}</p>
          <Link
            to="/teacher/timetable"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {tr("teacher_nav_add_timetable")}
          </Link>
        </div>
      </TeacherDashboardSection>
    );
  }

  return (
    <TeacherDashboardSection
      title={tr("teacher_dash_schedule_title")}
      icon={<CalendarClock className="h-5 w-5" />}
      action={
        <Link
          to="/teacher/timetable/edit"
          className="text-xs font-semibold text-primary hover:underline"
        >
          {tr("teacher_nav_edit_timetable")}
        </Link>
      }
    >
      <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{timetable.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {tr("teacher_timetable_uploaded")}:{" "}
              {new Date(timetable.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:border-primary/40"
          >
            <ExternalLink className="h-4 w-4" />
            {tr("teacher_timetable_open")}
          </a>
        ) : null}
      </div>
    </TeacherDashboardSection>
  );
}

type TeacherTimetablePageProps = {
  mode: "add" | "edit";
};

export function TeacherTimetablePage({ mode }: TeacherTimetablePageProps) {
  const { tr } = useI18n();
  const { context } = useTeacherShell();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TeacherTimetableRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const reload = async () => {
    if (!context?.userId) return;
    setLoading(true);
    setError(null);
    try {
      const record = await fetchTeacherTimetable();
      setTimetable(record);
      if (record) {
        const url = await getTeacherTimetableSignedUrl(record.storagePath);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    } catch {
      setError(tr("teacher_timetable_load_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [context?.userId]);

  const handleUpload = async (file: File) => {
    if (!context?.userId) return;
    setUploading(true);
    setError(null);
    try {
      const { uploadTeacherTimetable, validateTeacherTimetableFile } = await import(
        "@/lib/teacher-timetable"
      );
      const validation = validateTeacherTimetableFile(file);
      if (validation === "invalid_type") {
        setError(tr("teacher_timetable_invalid_type"));
        return;
      }
      if (validation === "too_large") {
        setError(tr("teacher_timetable_too_large"));
        return;
      }
      await uploadTeacherTimetable(file);
      await reload();
    } catch {
      setError(tr("teacher_timetable_upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!context?.userId || !timetable) return;
    setRemoving(true);
    setError(null);
    try {
      const { removeTeacherTimetable } = await import("@/lib/teacher-timetable");
      await removeTeacherTimetable();
      setTimetable(null);
      setPreviewUrl(null);
    } catch {
      setError(tr("teacher_timetable_remove_error"));
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  const isEdit = mode === "edit";
  const title = isEdit ? tr("teacher_nav_edit_timetable") : tr("teacher_nav_add_timetable");

  if (isEdit && !timetable) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-2xl text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{tr("teacher_timetable_none_to_edit")}</p>
        <Link
          to="/teacher/timetable"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {tr("teacher_nav_add_timetable")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-foreground">{title}</h1>
        {timetable ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-primary/40 print:hidden"
          >
            {tr("teacher_report_print")}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {timetable ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{timetable.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {timetable.mimeType} · {(timetable.fileSize / 1024).toFixed(0)} KB
              </p>
              <p className="text-sm text-muted-foreground">
                {tr("teacher_timetable_uploaded")}:{" "}
                {new Date(timetable.uploadedAt).toLocaleString()}
              </p>
            </div>
          </div>
          {previewUrl ? (
            <div className="mt-4">
              {timetable.mimeType.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={timetable.fileName}
                  className="max-h-80 w-full rounded-lg border border-border object-contain"
                />
              ) : (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:border-primary/40"
                >
                  <ExternalLink className="h-4 w-4" />
                  {tr("teacher_timetable_open")}
                </a>
              )}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{tr("teacher_timetable_empty")}</p>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] print:hidden">
        <input
          ref={inputRef}
          type="file"
          accept={TEACHER_TIMETABLE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {timetable ? tr("teacher_timetable_replace") : tr("teacher_timetable_upload")}
        </button>
        {timetable ? (
          <button
            type="button"
            disabled={removing}
            onClick={() => void handleRemove()}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
          >
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tr("teacher_timetable_remove")}
          </button>
        ) : null}
      </section>
    </div>
  );
}
