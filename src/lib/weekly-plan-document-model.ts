import { gradeDisplayName } from "@/lib/grade-utils";
import type { Lang } from "@/lib/i18n-config";
import { islamicGroupLabel, sectionLabel, type IslamicGroup, type StudentSection } from "@/lib/student-academics";
import type { WeeklyPlanPeriod, WeeklyPlanRow } from "@/lib/weekly-planning";
import {
  formatWeeklyPlanSectionCodes,
  weeklyPlanSectionsFromRow,
} from "@/lib/weekly-planning";
import {
  WEEKLY_PLAN_MISSION,
  WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE,
  WEEKLY_PLAN_VISION,
} from "@/lib/weekly-planning-master-data";
import { certificateIslamicLogoUrl, certificateSchoolLogoUrl } from "@/lib/certificate-branding";

export const WEEKLY_PLAN_PDF_EXPORT_ID = "weekly-plan-pdf-export";

export type WeeklyPlanDocumentLanguage = "en" | "ar";

export type WeeklyPlanDocumentPeriod = {
  doNowMinutes: number;
  learningObjectiveMinutes: number;
  iDoMinutes: number;
  weDoMinutes: number;
  midAssessmentMinutes: number;
  youDoMinutes: number;
  exitTicketMinutes: number;
  doNow: string;
  learningObjectiveSuccessCriteria: string;
  iDo: string;
  weDo: string;
  midAssessment: string;
  youDoDeveloping: string;
  youDoSecuring: string;
  youDoMastering: string;
  youDoExtension: string;
  exitTicket: string;
  sirMethod: string;
  homework: string;
};

export type WeeklyPlanDocumentDifferentiation = {
  key: string;
  label: string;
  studentNames: string[];
  notes: string;
};

export type WeeklyPlanDocumentModel = {
  language: WeeklyPlanDocumentLanguage;
  dir: "ltr" | "rtl";
  title: string;
  departmentLine: string;
  logos: { islamic: string; school: string };
  teacher: string;
  phase: string;
  grade: string;
  gradeSlug: string;
  sectionCode: string;
  islamicGroupCode: string;
  section: string;
  studentCount: string;
  islamicGroup: string;
  day: string;
  date: string;
  subject: string;
  domain: string;
  week: string;
  successCriterion: string;
  learningOutcomes: string;
  unit: string;
  lessonTitle: string;
  uaeCulture: string;
  crossCurricular: string;
  p21Skills: string[];
  keyVocabulary: string;
  resources: string;
  differentiation: WeeklyPlanDocumentDifferentiation[];
  firstPeriod: WeeklyPlanDocumentPeriod;
  secondPeriod: WeeklyPlanDocumentPeriod;
  reflection: string;
  mission: string;
  vision: string;
  labels: WeeklyPlanDocumentLabels;
};

export type WeeklyPlanDocumentLabels = {
  teacher: string;
  phase: string;
  grade: string;
  section: string;
  studentCount: string;
  islamicGroup: string;
  day: string;
  date: string;
  subject: string;
  domain: string;
  week: string;
  successCriterion: string;
  learningOutcomes: string;
  unit: string;
  lessonTitle: string;
  uaeCulture: string;
  crossCurricular: string;
  p21: string;
  vocabulary: string;
  resources: string;
  differentiation: string;
  firstPeriod: string;
  secondPeriod: string;
  reflection: string;
  mission: string;
  vision: string;
  doNow: string;
  objective: string;
  iDo: string;
  weDo: string;
  mid: string;
  youDo: string;
  exitTicket: string;
  sir: string;
  homework: string;
  youDoDeveloping: string;
  youDoSecuring: string;
  youDoMastering: string;
  youDoExtension: string;
  processOfLearning: string;
};

const DOCUMENT_LABELS: Record<WeeklyPlanDocumentLanguage, WeeklyPlanDocumentLabels> = {
  en: {
    teacher: "Teacher",
    phase: "Phase",
    grade: "Grade",
    section: "Sections",
    studentCount: "Actual No. of Students",
    islamicGroup: "Islamic Group",
    day: "Day",
    date: "Date",
    subject: "Subject",
    domain: "Domain",
    week: "Week",
    successCriterion: "Success Criterion",
    learningOutcomes: "Learning Outcomes",
    unit: "Unit",
    lessonTitle: "Lesson Title",
    uaeCulture: "Links to UAE Culture",
    crossCurricular: "Cross-Curricular / Real-Life Connections",
    p21: "P21 — 21st Century Skills",
    vocabulary: "Key Vocabulary",
    resources: "Resources / Digital Platforms",
    differentiation: "Differentiation",
    firstPeriod: "First Period",
    secondPeriod: "Second Period",
    reflection: "Teacher Reflection (end of week)",
    mission: "Mission",
    vision: "Vision",
    doNow: "Do Now — Engage (Task 1)",
    objective: "Learning Objective & Success Criteria",
    iDo: "I Do",
    weDo: "We Do",
    mid: "Mid Assessment / Check for Understanding",
    youDo: "You Do",
    exitTicket: "Exit Ticket & SIR",
    sir: "SIR Method",
    homework: "Homework / Follow-Up",
    youDoDeveloping: "Orange — Developing",
    youDoSecuring: "Yellow — Securing",
    youDoMastering: "Green — Mastering",
    youDoExtension: "Blue — Extension",
    processOfLearning: "Process of Learning",
  },
  ar: {
    teacher: "المعلم",
    phase: "المرحلة",
    grade: "الصف",
    section: "الشعب",
    studentCount: "عدد الطلاب الفعلي",
    islamicGroup: "المجموعة الإسلامية",
    day: "اليوم",
    date: "التاريخ",
    subject: "المادة",
    domain: "المجال",
    week: "الأسبوع",
    successCriterion: "معيار النجاح",
    learningOutcomes: "مخرجات التعلم",
    unit: "الوحدة",
    lessonTitle: "عنوان الدرس",
    uaeCulture: "ارتباط بالثقافة الإماراتية",
    crossCurricular: "ارتباطات عبر المناهج / الحياة الواقعية",
    p21: "مهارات القرن 21 (P21)",
    vocabulary: "المفردات الأساسية",
    resources: "الموارد / المنصات الرقمية",
    differentiation: "التمايز",
    firstPeriod: "الحصة الأولى",
    secondPeriod: "الحصة الثانية",
    reflection: "تأمل المعلم (نهاية الأسبوع)",
    mission: "الرسالة",
    vision: "الرؤية",
    doNow: "ابدأ الآن — اشرك (المهمة 1)",
    objective: "هدف التعلم ومعايير النجاح",
    iDo: "أنا أفعل",
    weDo: "نحن نفعل",
    mid: "تقييم منتصف / تحقق من الفهم",
    youDo: "أنت تفعل",
    exitTicket: "تذكرة الخروج و SIR",
    sir: "أسلوب SIR",
    homework: "الواجب / المتابعة",
    youDoDeveloping: "برتقالي — Developing",
    youDoSecuring: "أصفر — Securing",
    youDoMastering: "أخضر — Mastering",
    youDoExtension: "أزرق — Extension",
    processOfLearning: "عملية التعلم",
  },
};

const TITLES: Record<WeeklyPlanDocumentLanguage, { title: string; department: string }> = {
  en: {
    title: "Islamic Education Department | Weekly Lesson Plan",
    department: "Islamic Education Department",
  },
  ar: {
    title: "قسم التربية الإسلامية | إعداد الخطة الأسبوعية",
    department: "قسم التربية الإسلامية",
  },
};

function display(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

function mapPeriod(period: WeeklyPlanPeriod | null | undefined): WeeklyPlanDocumentPeriod {
  const p = period ?? {};
  return {
    doNowMinutes: p.do_now_minutes ?? 5,
    learningObjectiveMinutes: p.learning_objective_minutes ?? 2,
    iDoMinutes: p.i_do_minutes ?? 5,
    weDoMinutes: p.we_do_minutes ?? 5,
    midAssessmentMinutes: p.mid_assessment_minutes ?? 5,
    youDoMinutes: p.you_do_minutes ?? 20,
    exitTicketMinutes: p.exit_ticket_minutes ?? 5,
    doNow: display(p.do_now),
    learningObjectiveSuccessCriteria: display(p.learning_objective_success_criteria),
    iDo: display(p.i_do),
    weDo: display(p.we_do),
    midAssessment: display(p.mid_assessment),
    youDoDeveloping: display(p.you_do?.developing),
    youDoSecuring: display(p.you_do?.securing),
    youDoMastering: display(p.you_do?.mastering),
    youDoExtension: display(p.you_do?.extension),
    exitTicket: display(p.exit_ticket),
    sirMethod: display(p.sir_method),
    homework: display(p.homework),
  };
}

function reflectionForDocument(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "—";
  if (trimmed.replace(/\r\n/g, "\n") === WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE.replace(/\r\n/g, "\n")) {
    return "—";
  }
  return trimmed;
}

export function buildWeeklyPlanDocumentModel(
  plan: WeeklyPlanRow,
  options: { teacherDisplayName: string },
): WeeklyPlanDocumentModel {
  const language: WeeklyPlanDocumentLanguage = plan.plan_language === "ar" ? "ar" : "en";
  const lang = language as Lang;
  const labels = DOCUMENT_LABELS[language];
  const titles = TITLES[language];

  const differentiation: WeeklyPlanDocumentDifferentiation[] = [
    {
      key: "sod",
      label: language === "ar" ? "طلاب الهمم (SoD)" : "Students of Determination (SoD)",
      studentNames: plan.differentiation_sod?.student_names_snapshot ?? [],
      notes: display(plan.differentiation_sod?.notes),
    },
    {
      key: "eal",
      label: language === "ar" ? "الإنجليزية لغة إضافية (EAL)" : "English as an Additional Language (EAL)",
      studentNames: plan.differentiation_eal?.student_names_snapshot ?? [],
      notes: display(plan.differentiation_eal?.notes),
    },
    {
      key: "gt",
      label: language === "ar" ? "الموهوبون والمتفوقون (G&T)" : "Gifted & Talented (G&T)",
      studentNames: plan.differentiation_gt?.student_names_snapshot ?? [],
      notes: display(plan.differentiation_gt?.notes),
    },
    {
      key: "emirati",
      label: language === "ar" ? "الطلاب الإماراتيون" : "Emirati Students",
      studentNames: plan.differentiation_emirati?.student_names_snapshot ?? [],
      notes: display(plan.differentiation_emirati?.notes),
    },
  ];

  const planSections = weeklyPlanSectionsFromRow(plan);
  const sectionCodes = formatWeeklyPlanSectionCodes(planSections, lang);
  const sectionDisplay =
    sectionCodes ||
    (plan.section ? sectionLabel(plan.section as StudentSection, lang) : "—");

  return {
    language,
    dir: language === "ar" ? "rtl" : "ltr",
    title: titles.title,
    departmentLine: titles.department,
    logos: {
      islamic: certificateIslamicLogoUrl(),
      school: certificateSchoolLogoUrl(),
    },
    teacher: display(options.teacherDisplayName),
    phase: display(plan.phase),
    grade: display(gradeDisplayName(plan.grade, lang)),
    gradeSlug: plan.grade,
    sectionCode: (sectionCodes || plan.section) ?? "X",
    islamicGroupCode: plan.islamic_group ?? "X",
    section: sectionDisplay,
    studentCount: plan.student_count !== null && plan.student_count !== undefined ? String(plan.student_count) : "—",
    islamicGroup: plan.islamic_group ? islamicGroupLabel(plan.islamic_group as IslamicGroup, lang) : "—",
    day: display(plan.day),
    date: display(plan.plan_date),
    subject: display(plan.subject),
    domain: display(plan.domain),
    week: String(plan.week_number),
    successCriterion: display(plan.success_criterion),
    learningOutcomes: display(plan.learning_outcomes),
    unit: display(plan.unit),
    lessonTitle: display(plan.lesson_title),
    uaeCulture: display(plan.uae_culture),
    crossCurricular: display(plan.cross_curricular_real_life),
    p21Skills: plan.p21_skills ?? [],
    keyVocabulary: display(plan.key_vocabulary),
    resources: display(plan.resources),
    differentiation,
    firstPeriod: mapPeriod(plan.first_period),
    secondPeriod: mapPeriod(plan.second_period),
    reflection: reflectionForDocument(plan.teacher_reflection),
    mission: language === "ar" ? WEEKLY_PLAN_MISSION.ar : WEEKLY_PLAN_MISSION.en,
    vision: language === "ar" ? WEEKLY_PLAN_VISION.ar : WEEKLY_PLAN_VISION.en,
    labels,
  };
}

/** Keys that must be populated in a completeness fixture (excludes empty arrays). */
export const WEEKLY_PLAN_PRINTABLE_FIELD_KEYS = [
  "teacher",
  "phase",
  "grade",
  "section",
  "studentCount",
  "islamicGroup",
  "day",
  "date",
  "subject",
  "domain",
  "week",
  "successCriterion",
  "learningOutcomes",
  "unit",
  "lessonTitle",
  "uaeCulture",
  "crossCurricular",
  "p21Skills",
  "keyVocabulary",
  "resources",
  "differentiation",
  "firstPeriod.doNow",
  "firstPeriod.learningObjectiveSuccessCriteria",
  "firstPeriod.iDo",
  "firstPeriod.weDo",
  "firstPeriod.midAssessment",
  "firstPeriod.youDoDeveloping",
  "firstPeriod.youDoSecuring",
  "firstPeriod.youDoMastering",
  "firstPeriod.youDoExtension",
  "firstPeriod.exitTicket",
  "firstPeriod.sirMethod",
  "firstPeriod.homework",
  "secondPeriod.doNow",
  "secondPeriod.learningObjectiveSuccessCriteria",
  "secondPeriod.iDo",
  "secondPeriod.weDo",
  "secondPeriod.midAssessment",
  "secondPeriod.youDoDeveloping",
  "secondPeriod.youDoSecuring",
  "secondPeriod.youDoMastering",
  "secondPeriod.youDoExtension",
  "secondPeriod.exitTicket",
  "secondPeriod.sirMethod",
  "secondPeriod.homework",
  "reflection",
  "mission",
  "vision",
] as const;

export function assertWeeklyPlanDocumentModelComplete(model: WeeklyPlanDocumentModel): boolean {
  if (model.teacher === "—") return false;
  if (model.phase === "—") return false;
  if (model.grade === "—") return false;
  if (model.section === "—") return false;
  if (model.studentCount === "—") return false;
  if (model.islamicGroup === "—") return false;
  if (model.day === "—") return false;
  if (model.date === "—") return false;
  if (model.subject === "—") return false;
  if (model.domain === "—") return false;
  if (model.successCriterion === "—") return false;
  if (model.learningOutcomes === "—") return false;
  if (model.unit === "—") return false;
  if (model.lessonTitle === "—") return false;
  if (model.uaeCulture === "—") return false;
  if (model.crossCurricular === "—") return false;
  if (model.p21Skills.length === 0) return false;
  if (model.keyVocabulary === "—") return false;
  if (model.resources === "—") return false;
  if (model.differentiation.length !== 4) return false;
  for (const cat of model.differentiation) {
    if (cat.studentNames.length === 0 || cat.notes === "—") return false;
  }
  const checkPeriod = (p: WeeklyPlanDocumentPeriod) => {
    if (p.doNow === "—") return false;
    if (p.learningObjectiveSuccessCriteria === "—") return false;
    if (p.iDo === "—") return false;
    if (p.weDo === "—") return false;
    if (p.midAssessment === "—") return false;
    if (p.youDoDeveloping === "—") return false;
    if (p.youDoSecuring === "—") return false;
    if (p.youDoMastering === "—") return false;
    if (p.youDoExtension === "—") return false;
    if (p.exitTicket === "—") return false;
    if (p.sirMethod === "—") return false;
    if (p.homework === "—") return false;
    return true;
  };
  if (!checkPeriod(model.firstPeriod)) return false;
  if (!checkPeriod(model.secondPeriod)) return false;
  if (model.reflection === "—") return false;
  if (!model.mission.trim() || !model.vision.trim()) return false;
  return true;
}

export function safeWeeklyPlanFilename(model: WeeklyPlanDocumentModel): string {
  const safe = (value: string) =>
    value
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) || "Plan";
  const week = String(model.week).padStart(2, "0");
  const grade = safe(model.gradeSlug);
  const section = safe(model.sectionCode);
  const group = safe(model.islamicGroupCode);
  const teacher = safe(optionsTeacherName(model.teacher));
  return `Weekly-Plan_Week-${week}_Grade-${grade}_${section}_${group}_${teacher}.pdf`;
}

function optionsTeacherName(teacher: string): string {
  return teacher === "—" ? "Teacher" : teacher;
}
