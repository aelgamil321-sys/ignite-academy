import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { frT, frL } from "./locale-packs/fr.mjs";
import { deT, deL } from "./locale-packs/de.mjs";
import { urT, urL } from "./locale-packs/ur.mjs";
import { zhT, zhL } from "./locale-packs/zh.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const enL = JSON.parse(readFileSync(join(root, "scripts/en-l.json"), "utf8"));

const SPURIOUS = new Set(["en", "ar", "lang", "locale", "dir", "setLang", "toggle", "tr", "bi", "biMaybe"]);
const tKeys = Object.keys(enT).filter((k) => !SPURIOUS.has(k) && enT[k] !== "");

const NEW_KEYS_EN = {
  auth_title: "Student Account",
  auth_lead: "Create your account or sign in to access your lessons, quizzes, and progress.",
  auth_create_student: "Create Student Account",
  auth_create_parent: "Create Parent Account",
  auth_login: "Login",
  auth_account_type: "Account type",
  auth_student_account: "Student Account",
  auth_parent_account: "Parent Account",
  auth_parent_full_name: "Parent full name",
  auth_parent_link_code: "Student Link Code",
  auth_parent_link_code_hint: "Enter the code from your child's student dashboard",
  auth_arabic_name: "Arabic Student Name",
  auth_arabic_name_hint: "Arabic Student Name / اسم الطالب بالعربية",
  auth_english_name: "English Student Name",
  auth_english_name_hint: "English Student Name / اسم الطالب بالإنجليزية",
  auth_email: "Email",
  auth_password: "Password",
  auth_grade: "Grade",
  auth_section: "Section",
  auth_islamic_group: "Islamic Group",
  auth_profile_photo: "Profile photo",
  auth_submit_signup: "Create account",
  auth_submit_login: "Sign in",
  auth_to_login: "Have an account? Sign in",
  auth_to_signup: "New here? Create an account",
  auth_welcome: "Welcome to the Academy",
  auth_explore_academy: "Explore the Academy",
  auth_start_journey: "Start your learning journey",
  auth_hero_bullets: "My lessons & tracking|My quizzes & progress|Videos & files library|Parent corner",
  auth_duplicate_email: "This email is already registered. Please sign in or use a different email.",
  auth_err_arabic_name: "Please enter the Arabic student name.",
  auth_err_english_name: "Please enter the English student name.",
  auth_err_section: "Please select your section.",
  auth_err_islamic_group: "Please select your Islamic group.",
  auth_err_photo: "Please upload a profile photo.",
  auth_err_parent_name: "Please enter the parent full name.",
  auth_err_link_code: "Please enter the Parent Link Code.",
  auth_success_student: "Your account was created. Please check your email to confirm it, then sign in.",
  auth_success_parent: "Your account was created. Please check your email to confirm it, then sign in.",
  auth_success_login: "Welcome to the Academy",
  auth_already_linked: "This student is already linked.",
  auth_linked_success: "Student linked successfully.",
  sign_out: "Sign out",
  signed_out: "Signed out",
  nav_admin: "Admin",
  profile_parent: "Parent Profile",
  profile_student: "Student Profile",
  dept_islamic_ed: "Department of Islamic Education – Ignite School",
  empty_published_lessons: "No published lessons yet.",
  empty_announcements_short: "No announcements yet.",
  hof_avg_score_label: "Avg. score",
  hof_certificates_label: "Certificates",
  grade_champion_suffix: "Champion",
};

const allTKeys = [...tKeys, ...Object.keys(NEW_KEYS_EN)];

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function emitTs(lang, tMap, lMap) {
  const tLines = allTKeys.map((k) => `  ${k}: "${esc(tMap[k])}",`);
  const lLines = enL.map((en) => `  "${esc(en)}": "${esc(lMap[en])}",`);
  return `/** ${lang.toUpperCase()} translations for Ignite Islamic Academy UI. */
export const ${lang}: Record<string, string> = {
${tLines.join("\n")}
};

/** ${lang.toUpperCase()} translations for L() English strings. */
export const ${lang}ByEn: Record<string, string> = {
${lLines.join("\n")}
};
`;
}

function validate(lang, tMap, lMap) {
  const missingT = allTKeys.filter((k) => !tMap[k]);
  const missingL = enL.filter((en) => !lMap[en]);
  if (missingT.length) throw new Error(`${lang}: missing ${missingT.length} t keys: ${missingT.slice(0, 5).join(", ")}`);
  if (missingL.length) throw new Error(`${lang}: missing ${missingL.length} L strings: ${missingL.slice(0, 3).join(", ")}`);
}

const packs = [
  ["fr", frT, frL],
  ["de", deT, deL],
  ["ur", urT, urL],
  ["zh", zhT, zhL],
];

for (const [lang, tMap, lMap] of packs) {
  validate(lang, tMap, lMap);
  const out = join(root, `src/lib/i18n/locales/${lang}.ts`);
  writeFileSync(out, emitTs(lang, tMap, lMap), "utf8");
  console.log(`${lang}.ts: ${allTKeys.length} t keys, ${enL.length} L strings`);
}
