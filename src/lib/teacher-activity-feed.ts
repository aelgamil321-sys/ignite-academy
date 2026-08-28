import { supabase } from "@/integrations/supabase/client";
import {
  assignmentTitle,
  fetchAllAssignmentsAdmin,
} from "@/lib/assignment";
import type { Bi } from "@/lib/curriculum";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import type { Lang } from "@/lib/i18n-config";
import type { ScopedStudentRow, TeacherContext } from "@/lib/teacher-dashboard";
import { fetchTeacherWeeklyPlans } from "@/lib/weekly-planning";

const FEED_LIMIT = 5;
const SOURCE_FETCH_LIMIT = 8;

export type TeacherActivityType =
  | "quiz_submission"
  | "assignment_submission"
  | "lesson_published"
  | "weekly_plan_update"
  | "announcement_created";

export type TeacherActivityItem = {
  id: string;
  type: TeacherActivityType;
  title: string;
  subtitle: string;
  timestamp: string;
  href?: string;
};

type FeedEvent = TeacherActivityItem & { sortAt: number };

function parseBi(raw: unknown): Bi {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    return { en: String(record.en ?? ""), ar: String(record.ar ?? "") };
  }
  return { en: String(raw ?? ""), ar: String(raw ?? "") };
}

function pickBi(bi: Bi, lang: Lang): string {
  return (lang === "ar" ? bi.ar : bi.en) || bi.en || bi.ar || "";
}

function parseTimestamp(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export async function fetchTeacherActivityFeed(
  context: TeacherContext,
  students: ScopedStudentRow[],
  lang: Lang,
): Promise<TeacherActivityItem[]> {
  const scopedStudentIds = students.map((student) => student.userId);
  const studentNameMap = new Map(students.map((student) => [student.userId, student.displayName]));
  const gradeSlugs = context.isLeadTeacher
    ? context.assignedGrades
    : [...new Set(context.assignments.map((a) => normalizeGradeSlug(a.grade) || a.grade))];

  const events: FeedEvent[] = [];

  if (scopedStudentIds.length > 0) {
    const [quizRes, assignmentSubRes, assignmentsRes] = await Promise.all([
      supabase
        .from("lesson_quiz_submissions")
        .select("id, student_id, lesson_id, submitted_at, status")
        .in("student_id", scopedStudentIds)
        .order("submitted_at", { ascending: false })
        .limit(SOURCE_FETCH_LIMIT),
      supabase
        .from("assignment_submissions")
        .select("id, student_id, assignment_id, submitted_at, status")
        .in("student_id", scopedStudentIds)
        .order("submitted_at", { ascending: false })
        .limit(SOURCE_FETCH_LIMIT),
      fetchAllAssignmentsAdmin(),
    ]);

    if (quizRes.error) throw quizRes.error;
    if (assignmentSubRes.error) throw assignmentSubRes.error;
    if (assignmentsRes.error) throw new Error(assignmentsRes.error);

    const lessonIds = [...new Set((quizRes.data ?? []).map((row) => row.lesson_id))];
    const lessonTitleMap = new Map<string, Bi>();

    if (lessonIds.length > 0) {
      const { data: lessons, error } = await supabase
        .from("lessons")
        .select("id, title")
        .in("id", lessonIds);
      if (error) throw error;
      for (const lesson of lessons ?? []) {
        lessonTitleMap.set(lesson.id, parseBi(lesson.title));
      }
    }

    const assignmentMap = new Map(
      (assignmentsRes.data ?? []).map((assignment) => [assignment.id, assignment]),
    );

    for (const row of quizRes.data ?? []) {
      const studentName = studentNameMap.get(row.student_id) ?? "";
      const lessonTitle = pickBi(lessonTitleMap.get(row.lesson_id) ?? { en: "", ar: "" }, lang);
      events.push({
        id: `quiz-${row.id}`,
        type: "quiz_submission",
        title: lessonTitle || pickBi({ en: "Quiz submission", ar: "إرسال اختبار" }, lang),
        subtitle: studentName,
        timestamp: row.submitted_at,
        href: "/teacher/quizzes",
        sortAt: parseTimestamp(row.submitted_at),
      });
    }

    for (const row of assignmentSubRes.data ?? []) {
      const assignment = assignmentMap.get(row.assignment_id);
      const studentName = studentNameMap.get(row.student_id) ?? "";
      const title = assignment ? pickBi(assignmentTitle(assignment), lang) : pickBi({ en: "Assignment", ar: "واجب" }, lang);
      events.push({
        id: `assignment-${row.id}`,
        type: "assignment_submission",
        title,
        subtitle: studentName,
        timestamp: row.submitted_at,
        href: "/teacher/assignments/submissions",
        sortAt: parseTimestamp(row.submitted_at),
      });
    }
  }

  if (gradeSlugs.length > 0) {
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id, title, published, created_at, updated_at, created_by")
      .in("grade", gradeSlugs)
      .eq("created_by", context.userId)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_FETCH_LIMIT);

    if (error) throw error;

    for (const lesson of lessons ?? []) {
      if (!lesson.published) continue;
      const title = pickBi(parseBi(lesson.title), lang);
      events.push({
        id: `lesson-${lesson.id}`,
        type: "lesson_published",
        title,
        subtitle: pickBi({ en: "Lesson published", ar: "درس منشور" }, lang),
        timestamp: lesson.updated_at ?? lesson.created_at,
        href: "/teacher/lessons",
        sortAt: parseTimestamp(lesson.updated_at ?? lesson.created_at),
      });
    }
  }

  const weeklyPlans = await fetchTeacherWeeklyPlans(context.userId);
  for (const plan of weeklyPlans.slice(0, SOURCE_FETCH_LIMIT)) {
    events.push({
      id: `plan-${plan.id}`,
      type: "weekly_plan_update",
      title: pickBi(
        {
          en: `Week ${plan.week_number} · Grade ${plan.grade}`,
          ar: `الأسبوع ${plan.week_number} · الصف ${plan.grade}`,
        },
        lang,
      ),
      subtitle: pickBi({ en: "Weekly plan updated", ar: "تحديث الخطة الأسبوعية" }, lang),
      timestamp: plan.updated_at,
      href: `/teacher/weekly-planning/${plan.id}`,
      sortAt: parseTimestamp(plan.updated_at),
    });
  }

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, title, published, created_at, updated_at")
    .eq("category", "announcement")
    .eq("created_by", context.userId)
    .order("created_at", { ascending: false })
    .limit(SOURCE_FETCH_LIMIT);

  if (articlesError) throw articlesError;

  for (const article of articles ?? []) {
    const title = pickBi(parseBi(article.title), lang);
    events.push({
      id: `announcement-${article.id}`,
      type: "announcement_created",
      title,
      subtitle: article.published
        ? pickBi({ en: "Announcement published", ar: "إعلان منشور" }, lang)
        : pickBi({ en: "Announcement draft", ar: "مسودة إعلان" }, lang),
      timestamp: article.updated_at ?? article.created_at,
      href: "/teacher/announcements",
      sortAt: parseTimestamp(article.updated_at ?? article.created_at),
    });
  }

  return events
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, FEED_LIMIT)
    .map(({ sortAt: _sortAt, ...item }) => item);
}
