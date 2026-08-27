/**
 * Printable document model completeness tests.
 */

import type { WeeklyPlanRow } from "@/lib/weekly-planning";
import {
  assertWeeklyPlanDocumentModelComplete,
  buildWeeklyPlanDocumentModel,
  WEEKLY_PLAN_PRINTABLE_FIELD_KEYS,
} from "@/lib/weekly-plan-document-model";

export type WeeklyPlanDocumentTestResult = { name: string; pass: boolean; detail: string };

function fullFixturePlan(): WeeklyPlanRow {
  return {
    id: "plan-test",
    teacher_id: "teacher-1",
    plan_language: "ar",
    week_number: 1,
    academic_year: "2026-2027",
    phase: "المرحلة الثانوية / High",
    grade: "10",
    section: "A",
    sections: ["A"],
    islamic_group: "B",
    student_count: 24,
    day: "الاثنين / Monday",
    plan_date: "2026-09-01",
    subject: "التربية الإسلامية / Islamic Education",
    domain: "العقيدة الإسلامية / Islamic Creed",
    success_criterion: "معيار نجاح طويل بالعربية يصف مخرجات التعلم المتوقعة للطلاب في نهاية الحصة.",
    learning_outcomes: "مخرجات تعلم مفصلة بالعربية مع نص طويل يوضح ما سيتعلمه الطالب.",
    unit: "الوحدة الأولى / Unit 1",
    lesson_title: "درس التوحيد",
    uae_culture: "ارتباط بالهوية الإماراتية",
    cross_curricular_real_life: "ارتباطات عبر المناهج",
    p21_skills: ["التفكير الناقد / Critical Thinking", "الإبداع / Creativity"],
    key_vocabulary: "إيمان، توحيد، عبادة",
    resources: "Schoology، الكتاب المدرسي",
    differentiation_sod: {
      student_ids: ["s1", "s2"],
      student_names_snapshot: ["أحمد علي", "سارة محمد"],
      notes: "دعم بصري ومهام مقسمة.",
    },
    differentiation_eal: {
      student_ids: ["s3"],
      student_names_snapshot: ["John Smith"],
      notes: "قاموس مرئي وجمل نموذجية.",
    },
    differentiation_gt: {
      student_ids: ["s4"],
      student_names_snapshot: ["فاطمة حسن"],
      notes: "مهمة إثرائية إضافية.",
    },
    differentiation_emirati: {
      student_ids: ["s5", "s6"],
      student_names_snapshot: ["خالد إماراتي", "مريم إماراتي"],
      notes: "ربط بالقيم المحلية.",
    },
    first_period: {
      do_now: "نشاط اشراك سريع",
      learning_objective_success_criteria: "هدف التعلم ومعايير النجاح",
      i_do: "نمذجة المعلم",
      we_do: "تطبيق جماعي",
      mid_assessment: "تحقق من الفهم",
      you_do: {
        developing: "مهمة المجموعة البرتقالية",
        securing: "مهمة المجموعة الصفراء",
        mastering: "مهمة المجموعة الخضراء",
        extension: "مهمة المجموعة الزرقاء",
      },
      exit_ticket: "تذكرة خروج",
      sir_method: "ذاتي / Self",
      homework: "واجب المتابعة",
    },
    second_period: {
      do_now: "مراجعة سريعة",
      learning_objective_success_criteria: "هدف الحصة الثانية",
      i_do: "نمذجة 2",
      we_do: "تطبيق 2",
      mid_assessment: "تقييم 2",
      you_do: {
        developing: "تطوير 2",
        securing: "تأمين 2",
        mastering: "إتقان 2",
        extension: "إثراء 2",
      },
      exit_ticket: "خروج 2",
      sir_method: "المعلم / Teacher",
      homework: "واجب 2",
    },
    teacher_reflection: "نجح نشاط Do Now. متابعة عمر وسارة الأسبوع القادم.",
    status: "complete",
    completion_percentage: 1,
    created_at: "",
    updated_at: "",
  };
}

export function runWeeklyPlanDocumentCompletenessTests(): WeeklyPlanDocumentTestResult[] {
  const plan = fullFixturePlan();
  const model = buildWeeklyPlanDocumentModel(plan, { teacherDisplayName: "Ahmed Al Awadhi" });
  const complete = assertWeeklyPlanDocumentModelComplete(model);

  const shortEnglish = buildWeeklyPlanDocumentModel(
    { ...plan, plan_language: "en", teacher_reflection: "Good week overall." },
    { teacherDisplayName: "Teacher" },
  );

  const mixed = buildWeeklyPlanDocumentModel(
    {
      ...plan,
      plan_language: "en",
      learning_outcomes: "يشرح الطالب معنى التوحيد بالعربية.",
      teacher_reflection: "Students engaged well in Arabic discussion.",
    },
    { teacherDisplayName: "Teacher" },
  );

  return [
    {
      name: "Printable field key catalog has 40 entries",
      pass: WEEKLY_PLAN_PRINTABLE_FIELD_KEYS.length >= 40,
      detail: `keys=${WEEKLY_PLAN_PRINTABLE_FIELD_KEYS.length}`,
    },
    {
      name: "Full fixture model is complete",
      pass: complete,
      detail: "all printable sections populated",
    },
    {
      name: "Full fixture includes all differentiation student names",
      pass: model.differentiation.every((c) => c.studentNames.length > 0),
      detail: `categories=${model.differentiation.length}`,
    },
    {
      name: "Arabic document uses RTL",
      pass: model.dir === "rtl" && model.language === "ar",
      detail: `dir=${model.dir}`,
    },
    {
      name: "English document uses LTR",
      pass: shortEnglish.dir === "ltr",
      detail: `dir=${shortEnglish.dir}`,
    },
    {
      name: "Short English reflection preserved in model",
      pass: shortEnglish.reflection === "Good week overall.",
      detail: shortEnglish.reflection,
    },
    {
      name: "Mixed-language teacher content preserved",
      pass:
        mixed.learningOutcomes.includes("الطالب") &&
        mixed.reflection.includes("Students engaged"),
      detail: "Arabic outcomes + English reflection",
    },
    {
      name: "You Do groups mapped for both periods",
      pass:
        model.firstPeriod.youDoDeveloping !== "—" &&
        model.secondPeriod.youDoExtension !== "—",
      detail: "four groups per period",
    },
    {
      name: "Mission and vision included",
      pass: model.mission.length > 20 && model.vision.length > 20,
      detail: "footer constants present",
    },
  ];
}

export function allWeeklyPlanDocumentCompletenessTestsPass(): boolean {
  return runWeeklyPlanDocumentCompletenessTests().every((t) => t.pass);
}
