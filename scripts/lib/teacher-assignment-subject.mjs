export const TEACHING_SUBJECT_TYPES = ["islamic_education", "quran"];
export const DEFAULT_TEACHING_SUBJECT = "islamic_education";

export function isTeachingSubjectType(value) {
  return TEACHING_SUBJECT_TYPES.includes(value);
}

export function normalizeTeachingSubjectType(value) {
  if (isTeachingSubjectType(value)) return value;
  return DEFAULT_TEACHING_SUBJECT;
}

export function teacherCanManageLessonScope(context, grade, subject = DEFAULT_TEACHING_SUBJECT) {
  if (context.isLeadTeacher) return true;
  const gradeNorm = String(grade ?? "").trim();
  return (context.assignments ?? []).some(
    (assignment) =>
      assignment.subject_type === subject &&
      String(assignment.grade ?? "").trim() === gradeNorm,
  );
}

export function teacherLessonInScope(context, lesson) {
  if (context.isLeadTeacher) return true;
  const subject = normalizeTeachingSubjectType(lesson.teachingSubject ?? DEFAULT_TEACHING_SUBJECT);
  return (context.assignments ?? []).some(
    (assignment) => assignment.subject_type === subject && assignment.grade === lesson.grade,
  );
}

export function studentLessonVisibleForGrade(lesson, gradeSlug) {
  if (!lesson.published) return false;
  return String(lesson.grade ?? "").trim() === String(gradeSlug ?? "").trim();
}

export function teacherAssignedGradesForSubject(context, subject) {
  if (context.isLeadTeacher) return [...new Set((context.assignments ?? []).map((a) => a.grade))];
  return [
    ...new Set(
      (context.assignments ?? [])
        .filter((assignment) => assignment.subject_type === subject)
        .map((assignment) => String(assignment.grade ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

export function migrationDefaultsExistingToIslamicEducation() {
  return DEFAULT_TEACHING_SUBJECT;
}
