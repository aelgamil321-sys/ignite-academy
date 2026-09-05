import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { deriveGradeSectionFromClassLabel } from "@/lib/timetable/timetable-grid";
import {
  displayTimetableSubjectCode,
  displayTimetableWeekday,
} from "@/lib/timetable/timetable-subject-display";
import type { TimetableSchedule, TimetableSlot, TimetableSlotType } from "@/lib/timetable/timetable-types";

const GRID_HEADERS = [
  { key: "p1", label: "P1" },
  { key: "p2", label: "P2" },
  { key: "p3", label: "P3" },
  { key: "p4", label: "P4" },
  { key: "break", label: "Break" },
  { key: "p5", label: "P5" },
  { key: "p6", label: "P6" },
  { key: "p7", label: "P7" },
] as const;

const SHORT_DAYS: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

function shortWeekdayLabel(day: string, lang: import("@/lib/i18n-config").Lang): string {
  return displayTimetableWeekday(day, lang).slice(0, 3);
}

function patchTeachingSlot(
  slot: TimetableSlot,
  patch: { type?: Extract<TimetableSlotType, "class" | "free">; subject?: string; classLabel?: string },
): TimetableSlot {
  if (slot.type === "break") return slot;

  if (patch.type === "free") {
    return {
      ...slot,
      type: "free",
      subject: "",
      classLabel: "",
      grade: "",
      section: "",
      needsReview: false,
      confidence: 1,
    };
  }

  const classLabel = (patch.classLabel ?? slot.classLabel).trim();
  const subject = (patch.subject ?? slot.subject).trim();
  const derived = deriveGradeSectionFromClassLabel(classLabel);
  const needsReview = !subject || !classLabel;

  return {
    ...slot,
    type: "class",
    subject,
    classLabel,
    grade: derived.grade,
    section: derived.section,
    needsReview,
    confidence: needsReview ? 0 : 1,
  };
}

export function updateScheduleCell(
  schedule: TimetableSchedule,
  day: string,
  slotIndex: number,
  patch: Parameters<typeof patchTeachingSlot>[1],
): TimetableSchedule {
  return {
    ...schedule,
    days: schedule.days.map((dayRow) => {
      if (dayRow.day !== day) return dayRow;
      return {
        ...dayRow,
        slots: dayRow.slots.map((slot, index) =>
          index === slotIndex ? patchTeachingSlot(slot, patch) : slot,
        ),
      };
    }),
  };
}

type TimetableWeeklyGridProps = {
  schedule: TimetableSchedule;
  editable?: boolean;
  onScheduleChange?: (schedule: TimetableSchedule) => void;
};

export function TimetableWeeklyGrid({
  schedule,
  editable = false,
  onScheduleChange,
}: TimetableWeeklyGridProps) {
  const { tr, lang } = useI18n();
  const [editingCell, setEditingCell] = useState<{ day: string; slotIndex: number } | null>(null);
  const [editType, setEditType] = useState<"class" | "free">("class");
  const [editSubject, setEditSubject] = useState("");
  const [editClassLabel, setEditClassLabel] = useState("");

  const openEditor = (day: string, slotIndex: number, slot: TimetableSlot) => {
    if (!editable || slot.type === "break") return;
    setEditingCell({ day, slotIndex });
    setEditType(slot.type === "free" ? "free" : "class");
    setEditSubject(slot.subject);
    setEditClassLabel(slot.classLabel);
  };

  const closeEditor = () => setEditingCell(null);

  const saveEditor = () => {
    if (!editingCell || !onScheduleChange) return;
    const next =
      editType === "free"
        ? updateScheduleCell(schedule, editingCell.day, editingCell.slotIndex, { type: "free" })
        : updateScheduleCell(schedule, editingCell.day, editingCell.slotIndex, {
            type: "class",
            subject: editSubject,
            classLabel: editClassLabel,
          });
    onScheduleChange(next);
    closeEditor();
  };

  const renderCellContent = (slot: TimetableSlot) => {
    if (slot.type === "break") {
      return (
        <span className="font-medium text-amber-700 dark:text-amber-300">
          {tr("teacher_timetable_slot_break")}
        </span>
      );
    }
    if (slot.type === "free") {
      return (
        <span className="text-muted-foreground">{tr("teacher_timetable_slot_free")}</span>
      );
    }
    return (
      <div className="space-y-0.5 text-left">
        <p className="font-semibold leading-tight">
          {displayTimetableSubjectCode(slot.subject, lang) || "—"}
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">{slot.classLabel || "—"}</p>
      </div>
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border" data-testid="timetable-weekly-grid">
        <Table className="min-w-[720px] text-xs sm:text-sm">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-14 font-semibold">{tr("teacher_timetable_col_day")}</TableHead>
              {GRID_HEADERS.map((col) => (
                <TableHead key={col.key} className="min-w-[72px] text-center font-semibold">
                  {col.key === "break"
                    ? tr("teacher_timetable_slot_break")
                    : col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.days.map((dayRow) => (
              <TableRow key={dayRow.day}>
                <TableCell className="font-medium">
                  {shortWeekdayLabel(dayRow.day, lang) || SHORT_DAYS[dayRow.day] || dayRow.day}
                </TableCell>
                {dayRow.slots.map((slot, slotIndex) => {
                  const isBreak = slot.type === "break";
                  const clickable = editable && !isBreak;
                  return (
                    <TableCell key={`${dayRow.day}-${slotIndex}`} className="p-1 align-top">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => openEditor(dayRow.day, slotIndex, slot)}
                        className={`relative min-h-[56px] w-full rounded-lg border px-1.5 py-1.5 text-center transition-colors ${
                          isBreak
                            ? "cursor-default border-amber-500/30 bg-amber-500/10"
                            : clickable
                              ? "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                              : "border-border bg-card"
                        }`}
                      >
                        {renderCellContent(slot)}
                        {slot.needsReview ? (
                          <Badge
                            variant="outline"
                            className="absolute -right-1 -top-1 border-amber-500 px-1 py-0 text-[9px] text-amber-700"
                          >
                            <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />
                            {tr("teacher_timetable_needs_review")}
                          </Badge>
                        ) : null}
                      </button>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editingCell != null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr("teacher_timetable_edit_cell")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tr("teacher_timetable_col_type")}</Label>
              <Select
                value={editType}
                onValueChange={(value) => setEditType(value as "class" | "free")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">{tr("teacher_timetable_slot_class")}</SelectItem>
                  <SelectItem value="free">{tr("teacher_timetable_slot_free")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editType === "class" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="timetable-edit-subject">{tr("teacher_timetable_col_subject")}</Label>
                  <Input
                    id="timetable-edit-subject"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="ISL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timetable-edit-class">{tr("teacher_timetable_col_class_label")}</Label>
                  <Input
                    id="timetable-edit-class"
                    value={editClassLabel}
                    onChange={(e) => setEditClassLabel(e.target.value)}
                    placeholder="G11A/G11B"
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor}>
              {tr("teacher_cancel")}
            </Button>
            <Button type="button" onClick={saveEditor}>
              {tr("teacher_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
