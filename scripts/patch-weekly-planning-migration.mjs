import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const seed = readFileSync(join(root, "scripts/weekly-planning-seed.generated.sql"), "utf8");
const migPath = join(
  root,
  "supabase/migrations/20260704120000_weekly_planning_foundation.sql",
);
let mig = readFileSync(migPath, "utf8");

mig = mig.replace(
  /subject text NOT NULL DEFAULT '[^']*'/,
  "subject text NOT NULL DEFAULT 'التربية الإسلامية / Islamic Education'",
);

const marker =
  "-- ---------------------------------------------------------------------------\n-- Seed official workbook master lists";
const idx = mig.indexOf(marker);
if (idx < 0) throw new Error("Seed marker not found in migration");

const head =
  mig.slice(0, idx + marker.length) +
  "\n-- ---------------------------------------------------------------------------\n" +
  seed.trim() +
  "\n";
writeFileSync(migPath, head, "utf8");

const fixSql =
  "-- Manual fix for corrupted weekly planning master data (run in Supabase SQL Editor)\n" +
  "-- Generated from src/lib/weekly-planning-master-data.ts\n\n" +
  seed.trim() +
  "\n\n" +
  "-- Optional: fix plans saved with corrupted subject default\n" +
  "UPDATE public.weekly_plans\n" +
  "SET subject = 'التربية الإسلامية / Islamic Education'\n" +
  "WHERE subject LIKE '%?%'\n" +
  "   OR subject LIKE '%\\ufffd%';";

writeFileSync(join(root, "scripts/fix-weekly-planning-arabic-data.sql"), fixSql + "\n", "utf8");
console.log("Patched migration and wrote scripts/fix-weekly-planning-arabic-data.sql");
