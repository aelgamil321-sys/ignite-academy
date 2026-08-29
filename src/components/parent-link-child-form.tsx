import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { mapParentLinkCodeError, redeemParentLinkCode } from "@/lib/parent-link-code";
import {
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";

export function ParentLinkChildForm({ onLinked }: { onLinked: () => void }) {
  const { tr } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  function friendlyError(errorCode: ReturnType<typeof mapParentLinkCodeError>): string {
    if (errorCode === "invalid_code") return tr("parent_link_code_invalid");
    if (errorCode === "not_authenticated" || errorCode === "not_parent") {
      return tr("parent_link_code_error_auth");
    }
    return tr("parent_link_code_error_generic");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setInlineError(null);
    try {
      const result = await redeemParentLinkCode(code);
      if (!result.ok) {
        const message = friendlyError(result.errorCode);
        setInlineError(message);
        toast.error(message);
        return;
      }
      if (result.alreadyLinked) {
        toast.success(tr("parent_link_code_already"));
      } else {
        toast.success(tr("parent_link_code_success"));
      }
      setCode("");
      onLinked();
    } catch {
      const message = tr("parent_link_code_error_generic");
      setInlineError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      id="parent-link-child-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={PARENT_DASH_SECTION}
      aria-labelledby="parent-link-child-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-primary shadow-sm">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="parent-link-child-heading" className={PARENT_DASH_SECTION_TITLE}>
            {tr("parent_settings_link_child_title")}
          </h2>
          <p className={`mt-1 ${PARENT_DASH_SECTION_LEAD}`}>{tr("parent_settings_link_code_instruction")}</p>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="parent-link-code-input" className="text-xs font-semibold text-foreground/70">
          {tr("parent_link_code_title")}
        </label>
        <input
          id="parent-link-code-input"
          type="text"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            if (inlineError) setInlineError(null);
          }}
          placeholder="IIA-X7K92A"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={inlineError ? true : undefined}
          aria-describedby={inlineError ? "parent-link-code-error" : undefined}
          className="mt-1.5 w-full max-w-md rounded-lg border border-border/90 bg-background px-3 py-2.5 text-sm font-mono tracking-wider uppercase shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {inlineError ? (
        <p id="parent-link-code-error" className="mt-2 text-sm text-destructive" role="alert">
          {inlineError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {tr("parent_add_child_submit")}
      </button>
    </form>
  );
}
