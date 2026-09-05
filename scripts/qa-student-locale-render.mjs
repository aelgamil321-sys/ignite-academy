/**
 * Student dashboard six-locale render QA (OpenAI calls = 0).
 * Mirrors translate() resolution: key override → ar/en → frByEn fallback.
 * Run: node scripts/qa-student-locale-render.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const STUDENT_KEYS = [
  "student_nav_dashboard",
  "student_nav_my_lessons",
  "student_nav_assignments",
  "student_nav_quizzes",
  "student_nav_resources",
  "student_nav_videos",
  "student_nav_achievements",
  "student_nav_honor_board",
  "student_nav_announcements",
  "student_nav_profile",
  "student_sign_out",
  "student_dash_welcome_lead",
  "student_dash_kpi_overall_progress",
  "student_dash_kpi_completed_lessons",
  "student_dash_kpi_avg_quiz",
  "student_dash_continue_learning",
  "student_dash_needs_attention",
  "student_dash_quick_actions",
  "student_dash_explore_grade_lessons",
];

const ENGLISH = {
  student_nav_dashboard: "Student Dashboard",
  student_nav_my_lessons: "My Lessons",
  student_nav_assignments: "Assignments",
  student_nav_quizzes: "Quizzes",
  student_nav_resources: "Learning Resources",
  student_nav_videos: "Educational Videos",
  student_nav_achievements: "Achievements & Certificates",
  student_nav_honor_board: "Honor Board",
  student_nav_announcements: "Announcements",
  student_nav_profile: "My Profile",
  student_sign_out: "Sign Out",
  student_dash_welcome_lead: "Ready to continue your learning journey?",
  student_dash_kpi_overall_progress: "Overall Progress",
  student_dash_kpi_completed_lessons: "Completed Lessons",
  student_dash_kpi_avg_quiz: "Average Quiz Score",
  student_dash_continue_learning: "Continue Learning",
  student_dash_needs_attention: "Needs Attention",
  student_dash_quick_actions: "Quick Actions",
  student_dash_explore_grade_lessons: "Explore your grade lessons",
};

const EXPECTED = {
  fr: {
    student_nav_dashboard: "Tableau de bord étudiant",
    student_nav_my_lessons: "Mes leçons",
    student_dash_welcome_lead: "Prêt à poursuivre votre parcours d'apprentissage ?",
    student_dash_quick_actions: "Actions rapides",
  },
  de: {
    student_nav_dashboard: "Schüler-Dashboard",
    student_nav_my_lessons: "Meine Lektionen",
    student_dash_welcome_lead: "Bereit, deine Lernreise fortzusetzen?",
    student_dash_quick_actions: "Schnellaktionen",
  },
  ar: {
    student_nav_dashboard: "لوحة الطالب",
    student_nav_my_lessons: "دروسي",
    student_dash_welcome_lead: "جاهز لمواصلة رحلتك التعليمية؟",
  },
  ur: {
    student_nav_dashboard: "طالب علم ڈیش بورڈ",
    student_nav_my_lessons: "میرے اسباق",
    student_dash_quick_actions: "فوری اقدامات",
  },
  zh: {
    student_nav_dashboard: "学生面板",
    student_nav_my_lessons: "我的课程",
    student_dash_quick_actions: "快捷操作",
  },
};

function readLocale(lang) {
  return readFileSync(join(root, `src/lib/i18n/locales/${lang}.ts`), "utf8");
}

function parseLocaleMap(source) {
  const map = {};
  for (const match of source.matchAll(/^\s+([a-z0-9_]+):\s*"((?:\\.|[^"\\])*)",/gm)) {
    map[match[1]] = match[2].replace(/\\"/g, '"');
  }
  return map;
}

function parseByEn(source) {
  const start = source.indexOf("ByEn:");
  if (start === -1) return {};
  const map = {};
  for (const match of source.slice(start).matchAll(/^\s+"((?:\\.|[^"\\])*)":\s*"((?:\\.|[^"\\])*)",/gm)) {
    map[match[1].replace(/\\"/g, '"')] = match[2].replace(/\\"/g, '"');
  }
  return map;
}

function translateKey(key, lang, localeMap, byEnMap) {
  const en = ENGLISH[key];
  assert.ok(en, `missing ENGLISH fixture for ${key}`);
  if (lang === "en") return en;
  if (lang === "ar") {
    const arMap = {
      student_nav_dashboard: "لوحة الطالب",
      student_nav_my_lessons: "دروسي",
      student_nav_assignments: "الواجبات",
      student_nav_quizzes: "الاختبارات",
      student_nav_resources: "المصادر التعليمية",
      student_nav_videos: "فيديوهات تعليمية",
      student_nav_achievements: "الإنجازات والشهادات",
      student_nav_honor_board: "لوحة الشرف",
      student_nav_announcements: "الإعلانات",
      student_nav_profile: "ملفي الشخصي",
      student_sign_out: "تسجيل الخروج",
      student_dash_welcome_lead: "جاهز لمواصلة رحلتك التعليمية؟",
      student_dash_kpi_overall_progress: "التقدم الإجمالي",
      student_dash_kpi_completed_lessons: "الدروس المكتملة",
      student_dash_kpi_avg_quiz: "متوسط الاختبارات",
      student_dash_continue_learning: "متابعة التعلم",
      student_dash_needs_attention: "يحتاج انتباهك",
      student_dash_quick_actions: "إجراءات سريعة",
      student_dash_explore_grade_lessons: "استكشف دروس صفك",
    };
    return arMap[key] ?? en;
  }
  const keyOverride = localeMap[key];
  if (keyOverride) return keyOverride;
  const byEn = byEnMap[en];
  if (byEn) return byEn;
  return en;
}

function testTranslateUsesByEnFallback() {
  const i18n = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
  assert.match(i18n, /LOCALE_BY_EN/);
  assert.match(i18n, /frByEn/);
  assert.match(i18n, /const byEn = LOCALE_BY_EN\[lang\]\?\.\[entry\.en\]/);
  console.log("PASS translate() uses extended-locale ByEn fallback");
}

function testFrenchNotEnglish() {
  const frSource = readLocale("fr");
  const frMap = parseLocaleMap(frSource);
  const frByEn = parseByEn(frSource);
  for (const key of STUDENT_KEYS) {
    const value = translateKey(key, "fr", frMap, frByEn);
    assert.notEqual(value, ENGLISH[key], `${key} still English in fr: "${value}"`);
  }
  for (const [key, expected] of Object.entries(EXPECTED.fr)) {
    assert.equal(translateKey(key, "fr", frMap, frByEn), expected, `${key} fr mismatch`);
  }
  console.log("PASS French student dashboard labels not English");
}

function testGermanNotEnglish() {
  const deSource = readLocale("de");
  const deMap = parseLocaleMap(deSource);
  const deByEn = parseByEn(deSource);
  for (const key of STUDENT_KEYS) {
    const value = translateKey(key, "de", deMap, deByEn);
    assert.notEqual(value, ENGLISH[key], `${key} still English in de`);
  }
  console.log("PASS German student dashboard labels not English");
}

function testArabicRtlConfig() {
  const cfg = readFileSync(join(root, "src/lib/i18n-config.ts"), "utf8");
  assert.match(cfg, /lang === "ar" \|\| lang === "ur"/);
  const i18n = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
  assert.match(i18n, /document\.documentElement\.dir = dir/);
  console.log("PASS Arabic/Urdu RTL wiring present");
}

function testAllSixLocalesHaveStudentNav() {
  for (const lang of ["fr", "de", "ur", "zh"]) {
    const map = parseLocaleMap(readLocale(lang));
    assert.ok(map.student_nav_dashboard, `${lang} missing student_nav_dashboard`);
    assert.ok(map.student_dash_quick_actions, `${lang} missing student_dash_quick_actions`);
    assert.notEqual(map.student_nav_my_lessons, ENGLISH.student_nav_my_lessons, `${lang} nav still English`);
  }
  console.log("PASS fr/de/ur/zh locale packs include student workspace keys");
}

function testNoOpenAiCalls() {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.doesNotMatch(self, /openai\.com/i);
  console.log("PASS QA makes 0 OpenAI calls");
}

testTranslateUsesByEnFallback();
testFrenchNotEnglish();
testGermanNotEnglish();
testArabicRtlConfig();
testAllSixLocalesHaveStudentNav();
testNoOpenAiCalls();
console.log("\nAll student locale render QA checks passed.");
