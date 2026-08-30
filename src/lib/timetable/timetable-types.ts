import { z } from "zod";

export const timetableSlotTypeSchema = z.enum(["class", "free", "break"]);

export const timetableSlotSchema = z.object({
  type: timetableSlotTypeSchema,
  period: z.number().int().positive().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  subject: z.string(),
  classLabel: z.string(),
  grade: z.string(),
  section: z.string(),
  room: z.string(),
  notes: z.string(),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
});

export const timetableDaySchema = z.object({
  day: z.string(),
  slots: z.array(timetableSlotSchema),
});

export const timetableScheduleSchema = z.object({
  days: z.array(timetableDaySchema),
  confirmedAt: z.string().optional(),
  version: z.number().optional(),
});

export type TimetableSlotType = z.infer<typeof timetableSlotTypeSchema>;
export type TimetableSlot = z.infer<typeof timetableSlotSchema>;
export type TimetableDay = z.infer<typeof timetableDaySchema>;
export type TimetableSchedule = z.infer<typeof timetableScheduleSchema>;

export type TimetableFlatSlot = TimetableSlot & {
  day: string;
  dayOfWeek: number;
};

export const TIMETABLE_CONFIDENCE_REVIEW_THRESHOLD = 0.75;
export const TIMETABLE_GRID_VERSION = 2;
