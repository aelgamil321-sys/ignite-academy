import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { timetableScheduleSchema } from "@/lib/timetable/timetable-types";

const confirmSchema = z.object({
  schedule: timetableScheduleSchema,
});

export const extractTeacherTimetable = createServerFn({ method: "POST" }).handler(async () => {
  const { handleExtractTeacherTimetable } = await import("@/lib/timetable/timetable-api.server");
  return handleExtractTeacherTimetable();
});

export const confirmTeacherTimetable = createServerFn({ method: "POST" })
  .inputValidator(confirmSchema)
  .handler(async ({ data }) => {
    const { handleConfirmTeacherTimetable } = await import("@/lib/timetable/timetable-api.server");
    return handleConfirmTeacherTimetable(data);
  });
