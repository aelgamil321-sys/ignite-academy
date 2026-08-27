import { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { resendSignupVerification } from "@/lib/email-verification";

type EmailVerificationRequiredProps = {
  email: string;
  /** Shorter message for gate screens vs full auth page */
  variant?: "gate" | "auth";
};

export function EmailVerificationRequired({ email, variant = "gate" }: EmailVerificationRequiredProps) {
  const { tr } = useI18n();
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    if (resendBusy || !email.trim()) return;
    setResendBusy(true);
    setResendSuccess(false);
    setResendError(null);
    const result = await resendSignupVerification(email);
    setResendBusy(false);
    if (result.ok) {
      setResendSuccess(true);
      return;
    }
    if (result.rateLimited) {
      setResendError(tr("auth_err_rate_limit"));
      return;
    }
    setResendError(tr("auth_resend_verification_failed"));
  }

  return (
    <div className="space-y-4 text-sm">
      <div
        role="alert"
        className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-foreground"
      >
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="space-y-2">
            <p className="font-medium leading-relaxed">
              {variant === "gate" ? tr("auth_email_not_confirmed") : tr("auth_check_your_email")}
            </p>
            {email ? (
              <p className="text-muted-foreground">
                {email}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {resendSuccess ? (
        <div
          role="status"
          className="rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-foreground"
        >
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="font-medium leading-relaxed">{tr("auth_resend_verification_success")}</p>
          </div>
        </div>
      ) : null}

      {resendError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-destructive"
        >
          <p className="font-medium leading-relaxed">{resendError}</p>
        </div>
      ) : null}

      {email.trim() ? (
        <button
          type="button"
          disabled={resendBusy}
          onClick={() => void handleResend()}
          className="inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resendBusy ? tr("auth_submitting") : tr("auth_resend_verification")}
        </button>
      ) : null}
    </div>
  );
}
