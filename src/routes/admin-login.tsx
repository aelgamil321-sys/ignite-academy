import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { adminHomeNavigateTarget } from "@/lib/account-role";
import {
  isPasswordRecoveryPending,
  isRecoveryAuthHash,
  markPasswordRecoveryPending,
  requestPasswordResetEmail,
  shouldDeferToPasswordReset,
} from "@/lib/password-recovery";

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
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (isRecoveryAuthHash()) {
        markPasswordRecoveryPending();
        window.location.replace(`/reset-password${window.location.hash}`);
        return;
      }
      if (isPasswordRecoveryPending()) {
        window.location.replace("/reset-password");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      if (shouldDeferToPasswordReset()) {
        window.location.replace("/reset-password");
        return;
      }
      if (await isAdmin(data.user.id)) navigate(adminHomeNavigateTarget());
    })();
    return () => { active = false; };
  }, [navigate]);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error(tr("auth_forgot_email_required"));
      return;
    }
    setBusy(true);
    try {
      await requestPasswordResetEmail(trimmed);
      setForgotSent(true);
      toast.success(tr("auth_reset_email_sent"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

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
      navigate(adminHomeNavigateTarget());
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
            {forgotMode
              ? tr("auth_forgot_password")
              : mode === "login"
                ? tr("auth_submit_login")
                : tr("admin_create_account")}
          </span>
        </div>
        <form
          onSubmit={(e) => {
            if (forgotMode) void handleForgotPassword(e);
            else void handleSubmit(e);
          }}
          className="space-y-3"
        >
          {forgotMode ? (
            <>
              <p className="text-sm text-muted-foreground">{tr("auth_forgot_password_lead")}</p>
              <div>
                <label className="text-xs font-medium">{tr("auth_email")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              {forgotSent ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{tr("auth_reset_email_sent")}</p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? tr("auth_submitting") : tr("auth_send_reset_link")}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setForgotSent(false);
                  }}
                  className="text-xs text-muted-foreground underline"
                >
                  {tr("auth_to_login")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium">{tr("auth_email")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">{tr("auth_password")}</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                {mode === "login" ? (
                  <div className="mt-2 text-end">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setForgotSent(false);
                      }}
                      className="text-xs text-primary underline"
                    >
                      {tr("auth_forgot_password")}
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? tr("auth_submitting") : mode === "login" ? tr("auth_submit_login") : tr("auth_submit_signup")}
              </button>
            </>
          )}
        </form>
        {!forgotMode ? (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <button onClick={() => setMode("signup")} className="underline">{tr("admin_first_admin_link")}</button>
            ) : (
              <button onClick={() => setMode("login")} className="underline">{tr("auth_to_login")}</button>
            )}
          </div>
        ) : null}
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          {tr("admin_new_account_note")}
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/auth" search={{ mode: "login" }} className="underline">
            {tr("reset_password_back_login")}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
