export type Bi = { en: string; ar: string };

export type QuizQuestionType = "multiple_choice" | "true_false";

export interface QuizQuestion {
  q: Bi;
  type: QuizQuestionType;
  options: Bi[];
  answer: number;
  points: number;
}

export interface Lesson {
  slug: string;
  title: Bi;
  subject: Bi;
  unit: Bi;
  duration: number;
  outcome: Bi;
  explanation: Bi;
  vocab: Array<{ term: Bi; def: Bi }>;
  activity: Bi;
  worksheet: Bi;
  videoTitle: Bi;
  quiz: QuizQuestion[];
}

export interface Grade {
  slug: string;
  name: Bi;
  stage: Bi;
  lessons: Lesson[];
}

const v = (en: string, ar: string): Bi => ({ en, ar });

function gradeShell(slug: string, name: Bi, stage: Bi): Grade {
  return { slug, name, stage, lessons: [] };
}

export const grades: Grade[] = [
  gradeShell("kg1", v("KG1", "روضة 1"), v("Kindergarten", "رياض الأطفال")),
  gradeShell("kg2", v("KG2", "روضة 2"), v("Kindergarten", "رياض الأطفال")),
  gradeShell("1", v("Grade 1", "الصف الأول"), v("Elementary", "المرحلة الابتدائية")),
  gradeShell("2", v("Grade 2", "الصف الثاني"), v("Elementary", "المرحلة الابتدائية")),
  gradeShell("3", v("Grade 3", "الصف الثالث"), v("Elementary", "المرحلة الابتدائية")),
  gradeShell("4", v("Grade 4", "الصف الرابع"), v("Elementary", "المرحلة الابتدائية")),
  gradeShell("5", v("Grade 5", "الصف الخامس"), v("Elementary", "المرحلة الابتدائية")),
  gradeShell("6", v("Grade 6", "الصف السادس"), v("Middle School", "المرحلة المتوسطة")),
  gradeShell("7", v("Grade 7", "الصف السابع"), v("Middle School", "المرحلة المتوسطة")),
  gradeShell("8", v("Grade 8", "الصف الثامن"), v("Middle School", "المرحلة المتوسطة")),
  gradeShell("9", v("Grade 9", "الصف التاسع"), v("High School", "المرحلة الثانوية")),
  gradeShell("10", v("Grade 10", "الصف العاشر"), v("High School", "المرحلة الثانوية")),
  gradeShell("11", v("Grade 11", "الصف الحادي عشر"), v("High School", "المرحلة الثانوية")),
  gradeShell("12", v("Grade 12", "الصف الثاني عشر"), v("High School", "المرحلة الثانوية")),
];

export const stages: Array<{ slug: string; name: Bi; desc: Bi; gradeSlugs: string[] }> = [
  { slug: "kindergarten", name: v("Kindergarten", "رياض الأطفال"), desc: v("Ages 4–6 · Foundations of faith through stories and play.", "من 4 إلى 6 سنوات · أصول الإيمان عبر القصص واللعب."), gradeSlugs: ["kg1", "kg2"] },
  { slug: "elementary", name: v("Elementary School", "المرحلة الابتدائية"), desc: v("Grades 1–5 · Quran, pillars, and good character.", "الصفوف 1–5 · القرآن والأركان والأخلاق الحسنة."), gradeSlugs: ["1", "2", "3", "4", "5"] },
  { slug: "middle", name: v("Middle School", "المرحلة المتوسطة"), desc: v("Grades 6–8 · Fiqh, Seerah, and Aqeedah in depth.", "الصفوف 6–8 · الفقه والسيرة والعقيدة بتعمق."), gradeSlugs: ["6", "7", "8"] },
  { slug: "high", name: v("High School", "المرحلة الثانوية"), desc: v("Grades 9–12 · Advanced studies and contemporary issues.", "الصفوف 9–12 · دراسات متقدمة وقضايا معاصرة."), gradeSlugs: ["9", "10", "11", "12"] },
];

export function getStage(slug: string) {
  return stages.find((s) => s.slug === slug);
}

const GRADE_SLUG_ALIASES: Record<string, string> = {
  "grade-8": "8", "grade 8": "8", "grade8": "8",
  "grade-1": "1", "grade-2": "2", "grade-3": "3", "grade-4": "4", "grade-5": "5",
  "grade-6": "6", "grade-7": "7", "grade-9": "9", "grade-10": "10", "grade-11": "11", "grade-12": "12",
};

function resolveGradeSlug(value: string): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  if (GRADE_SLUG_ALIASES[lower]) return GRADE_SLUG_ALIASES[lower];
  if (grades.some((g) => g.slug === v || g.slug === lower)) return v;
  const byName = grades.find((g) => g.name.en.toLowerCase() === lower || g.name.ar === v);
  return byName?.slug ?? v;
}

export function getGrade(slug: string): Grade | undefined {
  const normalized = resolveGradeSlug(slug);
  return grades.find((g) => g.slug === normalized);
}

export function getLesson(gradeSlug: string, lessonSlug: string) {
  const grade = getGrade(gradeSlug);
  const lesson = grade?.lessons.find((l) => l.slug === lessonSlug);
  return grade && lesson ? { grade, lesson } : undefined;
}
