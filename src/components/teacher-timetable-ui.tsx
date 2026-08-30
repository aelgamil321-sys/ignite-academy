import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Sparkles,
  Upload,
} from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import { TimetableWeeklyGrid } from "@/components/teacher-timetable-weekly-grid";
import { confirmTeacherTimetable, extractTeacherTimetable } from "@/lib/api/timetable.functions";
import { useI18n } from "@/lib/i18n";
import { useTeacherShell } from "@/lib/teacher-shell-context";
import { buildEmptyFixedSchedule, ensureFixedGridSchedule } from "@/lib/timetable/timetable-grid";
import type { TimetableSchedule } from "@/lib/timetable/timetable-types";
import { filterTodaySlots } from "@/lib/timetable/timetable-weekday";
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

  useEffect(() => {
    if (!context?.userId) return;
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const record = await fetchTeacherTimetable();
        if (active) setTimetable(record);
      } catch {
        if (active) setTimetable(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [context?.userId]);

  const todaySlots = useMemo(
    () => (timetable?.parsedSchedule ? filterTodaySlots(timetable.parsedSchedule) : []),
    [timetable?.parsedSchedule],
  );

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

  if (!timetable?.parsedSchedule) {
    return (
      <TeacherDashboardSection
        title={tr("teacher_dash_schedule_title")}
        icon={<CalendarClock className="h-5 w-5" />}
      >
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
          <CalendarClock className="mx-auto mb-2 h-8 w-8 text-brand-dark/60" />
          <p className="text-sm text-muted-foreground">{tr("teacher_dash_schedule_import")}</p>
          <Link
            to="/teacher/timetable"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {tr("teacher_timetable_import_cta")}
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
          to="/teacher/timetable"
          className="text-xs font-semibold text-primary hover:underline"
        >
          {tr("teacher_nav_edit_timetable")}
        </Link>
      }
    >
      {todaySlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr("teacher_timetable_no_classes_today")}</p>
      ) : (
        <ul className="space-y-3">
          {todaySlots.map((item) => (
            <li
              key={`${item.day}-${item.type}-${item.period ?? "break"}-${item.startTime}`}
              className="rounded-xl border border-border bg-muted/10 px-4 py-3"
            >
              <p className="text-sm font-semibold text-foreground">
                {item.startTime || "—"}
                {item.endTime ? ` – ${item.endTime}` : ""}
                {" — "}
                {item.type === "class"
                  ? item.classLabel || "—"
                  : item.type === "free"
                    ? tr("teacher_timetable_dash_free")
                    : tr("teacher_timetable_dash_break")}
              </p>
              {item.type === "class" ? (
                <p className="text-sm text-muted-foreground">{item.subject || "—"}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
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
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TeacherTimetableRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmedSchedule, setConfirmedSchedule] = useState<TimetableSchedule | null>(null);
  const [draftSchedule, setDraftSchedule] = useState<TimetableSchedule | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const reload = async (opts?: { preserveImport?: boolean }) => {
    if (!context?.userId) return;
    setLoading(true);
    setError(null);
    try {
      const record = await fetchTeacherTimetable();
      setTimetable(record);
      const saved = record?.parsedSchedule ? ensureFixedGridSchedule(record.parsedSchedule) : null;
      if (!opts?.preserveImport) {
        setConfirmedSchedule(saved);
      }
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

  useEffect(() => {
    if (mode === "edit" && confirmedSchedule && !draftSchedule && !loading) {
      setDraftSchedule(structuredClone(confirmedSchedule));
    }
  }, [mode, confirmedSchedule, draftSchedule, loading]);

  const handleUpload = async (file: File) => {
    if (!context?.userId) return;
    setUploading(true);
    setError(null);
    setDraftSchedule(null);
    setSaveSuccess(false);
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
      setConfirmedSchedule(null);
      setImportMode(true);
      await reload({ preserveImport: true });
    } catch {
      setError(tr("teacher_timetable_upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async () => {
    if (!timetable) return;
    setExtracting(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const result = await extractTeacherTimetable();
      setDraftSchedule(ensureFixedGridSchedule(result.schedule));
      setImportMode(false);
    } catch (err) {
      const code = err instanceof Error ? err.message : "extract_failed";
      if (code === "ai_disabled") {
        setError(tr("teacher_timetable_ai_disabled"));
      } else {
        setError(tr("teacher_timetable_extract_error"));
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleManualFill = () => {
    setDraftSchedule(buildEmptyFixedSchedule());
    setImportMode(false);
    setSaveSuccess(false);
  };

  const handleConfirm = async () => {
    if (!draftSchedule) return;
    setConfirming(true);
    setError(null);
    try {
      const schedule = ensureFixedGridSchedule(draftSchedule);
      await confirmTeacherTimetable({ data: { schedule } });
      setConfirmedSchedule(schedule);
      setDraftSchedule(null);
      setImportMode(false);
      setSaveSuccess(true);
      await reload();
    } catch {
      setError(tr("teacher_timetable_confirm_error"));
    } finally {
      setConfirming(false);
    }
  };

  const draftNeedsReview = draftSchedule?.days.some((day) =>
    day.slots.some((slot) => slot.needsReview),
  );

  const displaySchedule = draftSchedule ?? confirmedSchedule;
  const isEditing = draftSchedule != null;
  const hasConfirmed = confirmedSchedule != null;
  const showImportPanel =
    importMode || (!hasConfirmed && !isEditing && timetable != null);
  const showAiActions = showImportPanel && timetable != null && !isEditing;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  const isEditRoute = mode === "edit";
  const title = isEditRoute ? tr("teacher_nav_edit_timetable") : tr("teacher_timetable_import_title");

  if (isEditRoute && !timetable) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-2xl text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{tr("teacher_timetable_none_to_edit")}</p>
        <Link
          to="/teacher/timetable"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {tr("teacher_timetable_import_cta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-foreground">{title}</h1>
        {hasConfirmed && !isEditing ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftSchedule(structuredClone(confirmedSchedule));
                setSaveSuccess(false);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:border-primary/40"
            >
              <Pencil className="h-4 w-4" />
              {tr("teacher_timetable_edit")}
            </button>
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:border-primary/40"
            >
              <Upload className="h-4 w-4" />
              {tr("teacher_timetable_replace")}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {saveSuccess && hasConfirmed && !isEditing ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{tr("teacher_timetable_saved_success")}</p>
        </div>
      ) : null}

      {!timetable ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
          <CalendarClock className="mx-auto mb-3 h-10 w-10 text-primary/70" />
          <p className="text-base font-medium text-foreground">{tr("teacher_timetable_import_title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tr("teacher_timetable_import_hint")}</p>
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
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {tr("teacher_timetable_upload")}
          </button>
        </section>
      ) : (
        <>
          {showImportPanel ? (
            <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{timetable.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {timetable.mimeType} · {(timetable.fileSize / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              {previewUrl && timetable.mimeType.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={timetable.fileName}
                  className="mt-4 max-h-80 w-full rounded-lg border border-border object-contain"
                />
              ) : previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:border-primary/40"
                >
                  <ExternalLink className="h-4 w-4" />
                  {tr("teacher_timetable_open")}
                </a>
              ) : null}

              {showAiActions ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={extracting}
                    onClick={() => void handleExtract()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {extracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {tr("teacher_timetable_read_ai")}
                  </button>
                  <button
                    type="button"
                    onClick={handleManualFill}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium"
                  >
                    {tr("teacher_timetable_manual_fill")}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {displaySchedule ? (
            <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              {draftNeedsReview ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{tr("teacher_timetable_review_warning")}</p>
                </div>
              ) : null}

              <TimetableWeeklyGrid
                schedule={displaySchedule}
                editable={isEditing}
                onScheduleChange={isEditing ? setDraftSchedule : undefined}
              />

              {isEditing ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => void handleConfirm()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {tr("teacher_timetable_confirm")}
                  </button>
                  {hasConfirmed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftSchedule(null);
                        setSaveSuccess(false);
                      }}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium"
                    >
                      {tr("teacher_timetable_cancel_edit")}
                    </button>
                  ) : null}
                </div>
              ) : hasConfirmed ? (
                <p className="text-sm text-muted-foreground">{tr("teacher_timetable_confirmed_hint")}</p>
              ) : null}
            </section>
          ) : null}

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
          <input
            ref={replaceInputRef}
            type="file"
            accept={TEACHER_TIMETABLE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
