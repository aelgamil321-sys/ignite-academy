import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const set = new Set();

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".tsx") || path.endsWith(".ts")) {
      const content = readFileSync(path, "utf8");
      const re = /L\("((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\)/g;
      let m;
      while ((m = re.exec(content))) set.add(m[1]);
    }
  }
}

walk(root);
writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "l-strings-en.json"),
  JSON.stringify([...set].sort(), null, 2),
);
console.log("unique L en strings:", set.size);
