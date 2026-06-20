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

const localL = /^const L = \(en: string, ar: string\)(?:: Bi)? => \(\{ en, ar \}\);\r?\n/m;

for (const file of walk(root)) {
  let content = readFileSync(file, "utf8");
  if (!localL.test(content)) continue;

  content = content.replace(localL, "");

  if (content.includes('from "@/lib/i18n"')) {
    content = content.replace(
      /import \{([^}]+)\} from "@\/lib\/i18n";/,
      (match, inner) => {
        if (/\bL\b/.test(inner)) return match;
        return `import {${inner.trim()}, L } from "@/lib/i18n";`;
      },
    );
  } else {
    content = `import { L } from "@/lib/i18n";\n${content}`;
  }

  writeFileSync(file, content);
  console.log("imported L:", file);
}
