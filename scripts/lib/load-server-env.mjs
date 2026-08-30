/**
 * Load server-only env vars from local files for Node smoke/QA scripts.
 * Hydrates process.env so bundled server code (which reads process.env at
 * runtime) sees the same values as preflight checks.
 *
 * Production Cloudflare Workers use bindings injected per request — this
 * module is only for local Node execution paths.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseEnvFile(filePath) {
  const parsed = {};
  if (!existsSync(filePath)) return parsed;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    parsed[k] = v;
  }
  return parsed;
}

/**
 * @param {{ root?: string, hydrateProcessEnv?: boolean }} [options]
 * @returns {Record<string, string | undefined>}
 */
export function loadServerEnv({ root = defaultRoot, hydrateProcessEnv = false } = {}) {
  const merged = { ...process.env };

  for (const fileName of [".env", ".dev.vars"]) {
    const filePath = join(root, fileName);
    for (const [k, v] of Object.entries(parseEnvFile(filePath))) {
      if (!merged[k]) merged[k] = v;
    }
  }

  if (!merged.SUPABASE_URL?.trim() && merged.VITE_SUPABASE_URL?.trim()) {
    merged.SUPABASE_URL = merged.VITE_SUPABASE_URL;
  }

  if (hydrateProcessEnv) {
    for (const [k, v] of Object.entries(merged)) {
      if (v && !process.env[k]) process.env[k] = v;
    }
  }

  return merged;
}

/** Parse .env / .dev.vars and copy missing keys into process.env. */
export function hydrateServerProcessEnv(options = {}) {
  return loadServerEnv({ ...options, hydrateProcessEnv: true });
}
