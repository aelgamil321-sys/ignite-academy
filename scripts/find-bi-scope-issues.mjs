import fs from "fs";
import path from "path";

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") walk(p, files);
    else if (/\.tsx$/.test(e.name)) files.push(p);
  }
  return files;
}

const issues = [];

for (const file of walk(path.join(process.cwd(), "src"))) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes("bi(")) continue;

  const fnRegex =
    /(?:^|\n)(export\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;
  const fns = [];
  while ((match = fnRegex.exec(content)) !== null) {
    fns.push({ name: match[2], start: match.index + match[0].length, idx: match.index });
  }

  const arrowRegex =
    /(?:^|\n)(export\s+)?const\s+(\w+)\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*\{/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    fns.push({ name: match[2], start: match.index + match[0].length, idx: match.index });
  }

  fns.sort((a, b) => a.idx - b.idx);

  for (let i = 0; i < fns.length; i++) {
    const fn = fns[i];
    const end = i + 1 < fns.length ? fns[i + 1].idx : content.length;
    const body = content.slice(fn.start, end);
    const hasHook = /\bconst\s*\{[^}]*\bbi\b[^}]*\}\s*=\s*useI18n\s*\(/.test(body);
    const biCalls = [...body.matchAll(/\bbi\(/g)];
    if (biCalls.length > 0 && !hasHook) {
      const line =
        content.slice(0, fn.start + biCalls[0].index).split("\n").length;
      issues.push({ file, fn: fn.name, line, calls: biCalls.length });
    }
  }
}

for (const i of issues.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`${i.file} :: ${i.fn} @ ~${i.line} (${i.calls} bi calls)`);
}
