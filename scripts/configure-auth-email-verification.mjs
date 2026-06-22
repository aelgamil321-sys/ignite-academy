/**
 * Toggle Supabase Auth email confirmation (hosted project).
 * Usage:
 *   node scripts/configure-auth-email-verification.mjs disable
 *   node scripts/configure-auth-email-verification.mjs enable
 *
 * Requires SUPABASE_ACCESS_TOKEN. Uses SUPABASE_PROJECT_ID or default project ref.
 */
const projectRef = process.env.SUPABASE_PROJECT_ID || "aijukbdxyawxzekwhrdo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const mode = (process.argv[2] || "disable").toLowerCase();

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

if (mode !== "enable" && mode !== "disable") {
  console.error('Usage: node scripts/configure-auth-email-verification.mjs <enable|disable>');
  process.exit(1);
}

const mailerAutoconfirm = mode === "disable";

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_autoconfirm: mailerAutoconfirm,
  }),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Auth config update failed (${response.status}):`, body);
  process.exit(1);
}

console.log(
  `Supabase Auth email confirmation ${mode === "disable" ? "disabled" : "enabled"} (mailer_autoconfirm=${mailerAutoconfirm}).`,
);
console.log(body || "OK");
