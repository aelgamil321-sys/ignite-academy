import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = "src";
const fails = [];

const banned = [
  { re: />Loading lesson…</, msg: "Loading lesson…" },
  { re: />Loading lessons…</, msg: "Loading lessons…" },
  { re: /title: "Student Sign In — Ignite Islamic Academy"/, msg: "auth head title", files: ["routes/auth.tsx"] },
  { re: /title: "Parent Corner — Ignite Islamic Academy"/, msg: "parent head title", files: ["routes/parent.index.tsx"] },
  { re: /title: "Announcements — Ignite Islamic Academy"/, msg: "announcements head title", files: ["routes/announcements.index.tsx"] },
  { re: /title: "Lesson — Ignite Islamic Academy"/, msg: "lesson head title", files: ["routes/grades.$grade.$lesson.tsx"] },
  { re: /: "Could not load certificate"/, msg: "Could not load certificate" },
  { re: /throw new Error\(`Missing required fields:/, msg: "Missing required fields throw" },
  { re: /throw new Error\("Missing required fields: authenticated user/, msg: "auth user throw" },
  { re: />Generating PDF\.\.\.</, msg: "Generating PDF..." },
];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (/\.(tsx|ts)$/.test(name)) check(file.replace(/\\/g, "/"), readFileSync(file, "utf8"));
  }
}

function check(rel, text) {
  if (rel.includes("i18n/locales") || rel.includes("page-head.ts")) return;
  for (const rule of banned) {
    if (rule.files && !rule.files.some((f) => rel.includes(f))) continue;
    if (rule.re.test(text)) fails.push(`${rel}: ${rule.msg}`);
  }
}

walk(root);

if (fails.length) {
  console.log("FAIL");
  for (const f of fails) console.log(f);
  process.exit(1);
}
console.log("PASS");
