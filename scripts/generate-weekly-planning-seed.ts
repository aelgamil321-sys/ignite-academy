/**
 * Generates SQL seed statements for weekly planning master lists.
 * Run: npx tsx scripts/generate-weekly-planning-seed.ts
 * Writes: scripts/weekly-planning-seed.generated.sql
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  WEEKLY_PLAN_DOMAINS,
  WEEKLY_PLAN_PHASES,
  WEEKLY_PLAN_GRADES,
  WEEKLY_PLAN_SECTIONS,
  WEEKLY_PLAN_DAYS,
  WEEKLY_PLAN_P21_SKILLS,
  WEEKLY_PLAN_SIR_METHODS,
  WEEKLY_PLAN_UNITS,
  WEEKLY_PLAN_SUBJECTS,
  WEEKLY_PLAN_SUCCESS_CRITERIA,
} from "../src/lib/weekly-planning-master-data.ts";

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function sqlJson(value: Record<string, unknown> | undefined): string {
  if (!value) return "NULL";
  return `'${sqlEscape(JSON.stringify(value))}'::jsonb`;
}

const lists: Array<{
  key: string;
  labelAr: string;
  labelEn: string;
  items: typeof WEEKLY_PLAN_DOMAINS;
}> = [
  {
    key: "domains",
    labelAr: "المحاور",
    labelEn: "Domains",
    items: WEEKLY_PLAN_DOMAINS,
  },
  {
    key: "phases",
    labelAr: "المرحلة",
    labelEn: "Phase",
    items: WEEKLY_PLAN_PHASES,
  },
  {
    key: "grades",
    labelAr: "الصف",
    labelEn: "Grade",
    items: WEEKLY_PLAN_GRADES,
  },
  {
    key: "sections",
    labelAr: "الشعبة",
    labelEn: "Section",
    items: WEEKLY_PLAN_SECTIONS,
  },
  {
    key: "days",
    labelAr: "اليوم",
    labelEn: "Day",
    items: WEEKLY_PLAN_DAYS,
  },
  {
    key: "p21_skills",
    labelAr: "مهارات القرن 21",
    labelEn: "21st Century Skills",
    items: WEEKLY_PLAN_P21_SKILLS,
  },
  {
    key: "sir_methods",
    labelAr: "طريقة SIR",
    labelEn: "SIR Method",
    items: WEEKLY_PLAN_SIR_METHODS,
  },
  {
    key: "units",
    labelAr: "الوحدة",
    labelEn: "Unit",
    items: WEEKLY_PLAN_UNITS,
  },
  {
    key: "success_criteria",
    labelAr: "معايير النجاح (HOTS)",
    labelEn: "Success Criteria (HOTS)",
    items: WEEKLY_PLAN_SUCCESS_CRITERIA,
  },
  {
    key: "subjects",
    labelAr: "المادة",
    labelEn: "Subject",
    items: WEEKLY_PLAN_SUBJECTS,
  },
];

const lines: string[] = ["-- Weekly planning master list seed (generated from workbook audit)"];

for (const list of lists) {
  lines.push(`
INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('${sqlEscape(list.key)}', '${sqlEscape(list.labelAr)}', '${sqlEscape(list.labelEn)}')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;
`);

  list.items.forEach((item, index) => {
    const sortOrder = index + 1;
    lines.push(`
INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, '${sqlEscape(item.labelAr)}', '${sqlEscape(item.labelEn)}', ${sortOrder}, ${sqlJson({
      workbook_value: item.workbookValue,
      ...item.metadata,
    })}
FROM public.weekly_plan_master_lists
WHERE list_key = '${sqlEscape(list.key)}'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;
`);
  });
}

const sql = lines.join("\n");
const outPath = join(process.cwd(), "scripts", "weekly-planning-seed.generated.sql");
writeFileSync(outPath, sql + "\n", "utf8");
console.log(`Wrote ${outPath} (${sql.length} bytes)`);
