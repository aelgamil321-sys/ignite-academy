import type { Bi } from "@/lib/curriculum";
import { gradeMatches } from "@/lib/grade-utils";
import { supabase } from "@/integrations/supabase/client";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";
import { normalizeIslamicGroup, normalizeStudentSection } from "@/lib/student-academics";

export type AssignmentSubmissionStatus = "submitted" | "late" | "graded" | "missing";

export type AssignmentRow = {
  id: string;
  title_en: string;
  title_ar: string;
  instructions_en: string;
  instructions_ar: string;
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
  lesson_id: string | null;
  due_date: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  max_points: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type AssignmentSubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: AssignmentSubmissionStatus;
  text_response: string | null;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  score: number | null;
  max_points: number | null;
  feedback_en: string | null;
  feedback_ar: string | null;
  submitted_at: string;
  graded_at: string | null;
};

export type AssignmentWithSubmission = AssignmentRow & {
  submission: AssignmentSubmissionRow | null;
  displayStatus: AssignmentSubmissionStatus;
};

export type AssignmentAnalytics = {
  total: number;
  submitted: number;
  missing: number;
  late: number;
  graded: number;
  completionPct: number;
  byGrade: Array<{ key: string; total: number; completed: number; pct: number }>;
  bySection: Array<{ key: string; total: number; completed: number; pct: number }>;
  byIslamicGroup: Array<{ key: string; total: number; completed: number; pct: number }>;
};

export function assignmentTitle(a: Pick<AssignmentRow, "title_en" | "title_ar">): Bi {
  return { en: a.title_en, ar: a.title_ar };
}

export function assignmentInstructions(
  a: Pick<AssignmentRow, "instructions_en" | "instructions_ar">,
): Bi {
  return { en: a.instructions_en, ar: a.instructions_ar };
}

export function assignmentFeedback(
  s: Pick<AssignmentSubmissionRow, "feedback_en" | "feedback_ar">,
): Bi {
  return { en: s.feedback_en ?? "", ar: s.feedback_ar ?? "" };
}

export function normalizeAssignmentRow(row: Record<string, unknown>): AssignmentRow {
  return {
    ...(row as AssignmentRow),
    section: normalizeStudentSection(row.section as string | null),
    islamic_group: normalizeIslamicGroup(row.islamic_group as string | null),
    created_by: typeof row.created_by === "string" ? row.created_by : null,
  };
}

export function resolveDisplayStatus(
  assignment: Pick<AssignmentRow, "due_date">,
  submission: AssignmentSubmissionRow | null | undefined,
  now = Date.now(),
): AssignmentSubmissionStatus {
  if (submission) {
    if (submission.status === "graded") return "graded";
    if (submission.status === "late") return "late";
    return "submitted";
  }
  if (new Date(assignment.due_date).getTime() < now) return "missing";
  return "missing";
}

export function isAssignmentUpcoming(
  assignment: Pick<AssignmentRow, "due_date">,
  submission: AssignmentSubmissionRow | null | undefined,
  now = Date.now(),
): boolean {
  return !submission && new Date(assignment.due_date).getTime() >= now;
}

export function assignmentMatchesStudentProfile(
  assignment: Pick<AssignmentRow, "grade" | "section" | "islamic_group">,
  profile: {
    grade: string | null;
    section: StudentSection | null;
    islamic_group: IslamicGroup | null;
  },
): boolean {
  if (!profile.grade) return false;
  return (
    gradeMatches(assignment.grade, profile.grade) &&
    (!assignment.section || assignment.section === profile.section) &&
    (!assignment.islamic_group || assignment.islamic_group === profile.islamic_group)
  );
}

export async function fetchStudentAssignments(
  studentUserId: string,
): Promise<{ data: AssignmentWithSubmission[]; error: string | null }> {
  const [profileRes, assignRes, subRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("grade, section, islamic_group")
      .eq("user_id", studentUserId)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("*")
      .eq("published", true)
      .order("due_date", { ascending: true }),
    supabase
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", studentUserId),
  ]);

  if (profileRes.error) return { data: [], error: profileRes.error.message };
  if (assignRes.error) return { data: [], error: assignRes.error.message };
  if (subRes.error) return { data: [], error: subRes.error.message };

  const profile = profileRes.data;
  if (!profile?.grade) return { data: [], error: null };

  const subMap = new Map(
    (subRes.data ?? []).map((s) => [s.assignment_id, s as AssignmentSubmissionRow]),
  );

  const data = (assignRes.data ?? [])
    .map(normalizeAssignmentRow)
    .filter((assignment) =>
      assignmentMatchesStudentProfile(assignment, {
        grade: profile.grade,
        section: normalizeStudentSection(profile.section),
        islamic_group: normalizeIslamicGroup(profile.islamic_group),
      }),
    )
    .map((assignment) => {
      const submission = subMap.get(assignment.id) ?? null;
      return {
        ...assignment,
        submission,
        displayStatus: resolveDisplayStatus(assignment, submission),
      };
    });

  return { data, error: null };
}

export async function fetchAssignmentById(
  assignmentId: string,
  studentUserId?: string,
): Promise<{ assignment: AssignmentWithSubmission | null; error: string | null }> {
  const assignRes = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignRes.error) return { assignment: null, error: assignRes.error.message };
  if (!assignRes.data) return { assignment: null, error: null };

  let submission: AssignmentSubmissionRow | null = null;
  if (studentUserId) {
    const subRes = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentUserId)
      .maybeSingle();
    if (!subRes.error && subRes.data) {
      submission = subRes.data as AssignmentSubmissionRow;
    }
  }

  const assignment = normalizeAssignmentRow(assignRes.data);

  if (studentUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("grade, section, islamic_group")
      .eq("user_id", studentUserId)
      .maybeSingle();

    if (
      !profile?.grade ||
      !assignmentMatchesStudentProfile(assignment, {
        grade: profile.grade,
        section: normalizeStudentSection(profile.section),
        islamic_group: normalizeIslamicGroup(profile.islamic_group),
      })
    ) {
      return { assignment: null, error: null };
    }
  }

  return {
    assignment: {
      ...assignment,
      submission,
      displayStatus: resolveDisplayStatus(assignment, submission),
    },
    error: null,
  };
}

export async function submitAssignmentWork(input: {
  assignmentId: string;
  textResponse?: string;
  filePath?: string;
  fileName?: string;
  fileMime?: string;
}): Promise<{ data: AssignmentSubmissionRow | null; error: string | null }> {
  const { data, error } = await supabase.rpc("submit_assignment", {
    p_assignment_id: input.assignmentId,
    p_text_response: input.textResponse ?? null,
    p_file_path: input.filePath ?? null,
    p_file_name: input.fileName ?? null,
    p_file_mime: input.fileMime ?? null,
  });

  if (error) return { data: null, error: error.message };
  return { data: data as AssignmentSubmissionRow, error: null };
}

export async function fetchParentChildAssignments(
  studentUserId: string,
): Promise<{ data: AssignmentWithSubmission[]; error: string | null }> {
  return fetchStudentAssignments(studentUserId);
}

export async function fetchAllAssignmentsAdmin(): Promise<{
  data: AssignmentRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .order("due_date", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map(normalizeAssignmentRow), error: null };
}

export async function fetchAllSubmissionsAdmin(): Promise<{
  data: AssignmentSubmissionRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as AssignmentSubmissionRow[], error: null };
}

export type AssignmentSaveInput = {
  title_en: string;
  title_ar: string;
  instructions_en: string;
  instructions_ar: string;
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
  lesson_id: string | null;
  due_date: string;
  max_points: number;
  published: boolean;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
};

export async function createAssignment(
  input: AssignmentSaveInput,
  createdBy: string,
): Promise<{ data: AssignmentRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      ...input,
      created_by: createdBy,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: normalizeAssignmentRow(data), error: null };
}

export async function updateAssignment(
  id: string,
  input: Partial<AssignmentSaveInput>,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("assignments")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteAssignment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function gradeAssignmentSubmission(input: {
  submissionId: string;
  score: number;
  maxPoints: number;
  feedbackEn: string;
  feedbackAr: string;
  gradedBy: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      score: input.score,
      max_points: input.maxPoints,
      feedback_en: input.feedbackEn,
      feedback_ar: input.feedbackAr,
      status: "graded",
      graded_at: new Date().toISOString(),
      graded_by: input.gradedBy,
    })
    .eq("id", input.submissionId);

  return { error: error?.message ?? null };
}

export function computeAssignmentAnalytics(
  assignments: AssignmentRow[],
  submissions: AssignmentSubmissionRow[],
  profiles: Array<{
    user_id: string;
    grade: string | null;
    section: string | null;
    islamic_group: string | null;
  }>,
  filters?: {
    grade?: string;
    section?: string;
    islamicGroup?: string;
    lessonId?: string;
    status?: AssignmentSubmissionStatus | "all";
  },
): AssignmentAnalytics {
  const filteredAssignments = assignments.filter((a) => {
    if (filters?.grade && filters.grade !== "all" && a.grade !== filters.grade) return false;
    if (filters?.section && filters.section !== "all" && a.section !== filters.section) return false;
    if (filters?.islamicGroup && filters.islamicGroup !== "all" && a.islamic_group !== filters.islamicGroup) return false;
    if (filters?.lessonId && filters.lessonId !== "all" && a.lesson_id !== filters.lessonId) return false;
    return a.published;
  });

  const subByAssignmentStudent = new Map<string, AssignmentSubmissionRow>();
  for (const s of submissions) {
    subByAssignmentStudent.set(`${s.assignment_id}:${s.student_id}`, s);
  }

  const eligibleStudents = profiles.filter((p) => {
    if (filters?.grade && filters.grade !== "all" && p.grade !== filters.grade) return false;
    if (filters?.section && filters.section !== "all" && p.section !== filters.section) return false;
    if (filters?.islamicGroup && filters.islamicGroup !== "all" && p.islamic_group !== filters.islamicGroup) return false;
    return !!p.grade;
  });

  let total = 0;
  let submitted = 0;
  let missing = 0;
  let late = 0;
  let graded = 0;

  const gradeBuckets = new Map<string, { total: number; completed: number }>();
  const sectionBuckets = new Map<string, { total: number; completed: number }>();
  const groupBuckets = new Map<string, { total: number; completed: number }>();

  for (const assignment of filteredAssignments) {
    const students = eligibleStudents.filter(
      (p) =>
        p.grade === assignment.grade &&
        (!assignment.section || p.section === assignment.section) &&
        (!assignment.islamic_group || p.islamic_group === assignment.islamic_group),
    );

    for (const student of students) {
      const sub = subByAssignmentStudent.get(`${assignment.id}:${student.user_id}`);
      const status = resolveDisplayStatus(assignment, sub);
      if (filters?.status && filters.status !== "all" && status !== filters.status) continue;

      total += 1;
      if (status === "graded") {
        graded += 1;
        submitted += 1;
      } else if (status === "late") {
        late += 1;
        submitted += 1;
      } else if (status === "submitted") {
        submitted += 1;
      } else {
        missing += 1;
      }

      const completed = status !== "missing";
      const gKey = student.grade ?? "—";
      const sKey = student.section ?? "—";
      const iKey = student.islamic_group ?? "—";

      const bump = (map: Map<string, { total: number; completed: number }>, key: string) => {
        const cur = map.get(key) ?? { total: 0, completed: 0 };
        cur.total += 1;
        if (completed) cur.completed += 1;
        map.set(key, cur);
      };
      bump(gradeBuckets, gKey);
      bump(sectionBuckets, sKey);
      bump(groupBuckets, iKey);
    }
  }

  const toPctList = (map: Map<string, { total: number; completed: number }>) =>
    [...map.entries()]
      .map(([key, v]) => ({
        key,
        total: v.total,
        completed: v.completed,
        pct: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

  return {
    total,
    submitted,
    missing,
    late,
    graded,
    completionPct: total > 0 ? Math.round((submitted / total) * 100) : 0,
    byGrade: toPctList(gradeBuckets),
    bySection: toPctList(sectionBuckets),
    byIslamicGroup: toPctList(groupBuckets),
  };
}

export function statusBadgeClass(status: AssignmentSubmissionStatus): string {
  switch (status) {
    case "graded":
      return "bg-primary/10 text-primary";
    case "submitted":
      return "bg-sky-500/10 text-sky-700";
    case "late":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-destructive/10 text-destructive";
  }
}
