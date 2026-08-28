import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { parseSupabaseAuthHashError } from "@/lib/auth-redirect";
import { useI18n } from "@/lib/i18n";
import {
  clearPasswordRecoveryHashFromUrl,
  clearPasswordRecoveryPending,
  isPasswordRecoveryPending,
  isRecoveryAuthHash,
  markPasswordRecoveryPending,
  updatePasswordFromRecovery,
  waitForPasswordRecoverySession,
} from "@/lib/password-recovery";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Ignite Islamic Academy" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

type ResetState = "checking" | "ready" | "invalid" | "success";

function ResetPasswordPage() {
  const { tr } = useI18n();
  const [state, setState] = useState<ResetState>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const hashError = parseSupabaseAuthHashError();
      if (hashError) {
        if (!cancelled) setState("invalid");
        clearPasswordRecoveryHashFromUrl();
        return;
      }

      if (isRecoveryAuthHash()) {
        markPasswordRecoveryPending();
      }

      const ready = await waitForPasswordRecoverySession();
      if (cancelled) return;

      if (ready && (isPasswordRecoveryPending() || isRecoveryAuthHash())) {
        setState("ready");
        clearPasswordRecoveryHashFromUrl();
        return;
      }

      setState("invalid");
      clearPasswordRecoveryHashFromUrl();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 8) {
      setFormError(tr("reset_password_min_length"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(tr("auth_err_password_mismatch"));
      return;
    }

    setBusy(true);
    try {
      await updatePasswordFromRecovery(newPassword);
      clearPasswordRecoveryPending();
      await supabase.auth.signOut();
      setState("success");
      toast.success(tr("reset_password_success"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      eyebrow={tr("reset_password_title")}
      title={tr("reset_password_title")}
      lead={tr("reset_password_lead")}
      crumbs={[{ label: tr("reset_password_title") }]}
    >
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <KeyRound className="h-5 w-5" />
          <span className="font-semibold">{tr("reset_password_title")}</span>
        </div>

        {state === "checking" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tr("auth_submitting")}
          </div>
        ) : null}

        {state === "invalid" ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">{tr("reset_password_invalid")}</p>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="inline-flex text-sm font-semibold text-primary hover:underline"
            >
              {tr("reset_password_back_login")}
            </Link>
          </div>
        ) : null}

        {state === "success" ? (
          <div className="space-y-4 text-sm">
            <p className="text-foreground font-medium">{tr("reset_password_success")}</p>
            <p className="text-muted-foreground">{tr("reset_password_success_hint")}</p>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {tr("reset_password_back_login")}
            </Link>
            <Link
              to="/admin-login"
              className="inline-flex ml-3 text-sm font-semibold text-primary hover:underline"
            >
              {tr("reset_password_admin_login")}
            </Link>
          </div>
        ) : null}

        {state === "ready" ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tr("reset_password_new")}
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {tr("reset_password_confirm")}
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? tr("auth_submitting") : tr("reset_password_save")}
            </button>
          </form>
        ) : null}
      </div>
    </PageShell>
  );
}
