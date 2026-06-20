import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (path.endsWith(".tsx") || path.endsWith(".ts")) files.push(path);
  }
  return files;
}

for (const file of walk(root)) {
  if (file.endsWith("i18n.tsx") || file.endsWith("i18n-config.ts")) continue;

  const original = readFileSync(file, "utf8");
  if (!original.includes("[locale]")) continue;

  let content = original;

  content = content.replace(/\)\[locale\]/g, ")[lang]");

  content = content.replace(/([\w$.]+)\[locale\]/g, "bi($1)");

  if (content.includes("bi(")) {
    content = content.replace(/const \{ ([^}]+) \} = useI18n\(\)/g, (match, inner) => {
      if (/\bbi\b/.test(inner)) return match;
      const trimmed = inner.trim().replace(/,\s*$/, "");
      return `const { ${trimmed}, bi } = useI18n()`;
    });
  }

  if (content !== original) {
    writeFileSync(file, content);
    console.log("fixed:", file);
  }
}
