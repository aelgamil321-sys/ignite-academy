import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { redeemParentLinkCode } from "@/lib/parent-link-code";

export function ParentLinkChildForm({ onLinked }: { onLinked: () => void }) {
  const { tr, locale } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const result = await redeemParentLinkCode(code);
      if (!result.ok) {
        toast.error(tr("parent_link_code_invalid"));
        return;
      }
      if (result.alreadyLinked) {
        toast.success(tr("parent_link_code_already"));
      } else {
        toast.success(tr("parent_link_code_success"));
      }
      setCode("");
      onLinked();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-lg text-foreground">{tr("parent_add_child_title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{tr("parent_add_child_lead")}</p>
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          {tr("parent_link_code_reg_label")}
        </label>
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="IIA-X7K92A"
          maxLength={20}
          autoComplete="off"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono tracking-wider uppercase"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
      >
        {tr("parent_add_child_submit")}
      </button>
    </form>
  );
}
