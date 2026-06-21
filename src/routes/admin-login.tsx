import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Ignite Islamic Academy" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in as admin, bounce to /admin
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      if (await isAdmin(data.user.id)) navigate({ to: "/admin" });
    })();
    return () => { active = false; };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin-login`,
            data: { role_intent: "admin" },
          },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Sign-up failed");
        toast.success(tr("admin_signup_success"));
        setMode("login");
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Sign-in failed");
      const ok = await isAdmin(data.user.id);
      if (!ok) {
        await supabase.auth.signOut();
        throw new Error(tr("admin_not_admin"));
      }
      toast.success(tr("admin_welcome_back"));
      navigate({ to: "/admin" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      eyebrow={tr("nav_admin")}
      title={tr("admin_sign_in_title")}
      lead={tr("admin_sign_in_lead")}
      crumbs={[{ label: tr("admin_login_crumb") }]}
    >
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Lock className="h-5 w-5" />{" "}
          <span className="font-semibold">
            {mode === "login" ? tr("auth_submit_login") : tr("admin_create_account")}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium">{tr("auth_email")}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">{tr("auth_password")}</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={busy}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-60">
            {busy ? tr("auth_submitting") : mode === "login" ? tr("auth_submit_login") : tr("auth_submit_signup")}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <button onClick={() => setMode("signup")} className="underline">{tr("admin_first_admin_link")}</button>
          ) : (
            <button onClick={() => setMode("login")} className="underline">{tr("auth_to_login")}</button>
          )}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          {tr("admin_new_account_note")}
        </p>
      </div>
    </PageShell>
  );
}
