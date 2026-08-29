import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function ParentLinkCodeCard({ code }: { code: string }) {
  const { tr } = useI18n();

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(tr("parent_link_code_copied"));
    } catch {
      toast.error(tr("copy_failed"));
    }
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="font-display text-lg text-foreground">{tr("parent_link_code_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tr("parent_link_code_note")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tr("parent_link_code_purpose")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-lg tracking-wider text-primary">
              {code}
            </code>
            <button
              type="button"
              onClick={() => {
                void copyCode();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
              aria-label={tr("parent_link_code_copy")}
            >
              <Copy className="h-4 w-4" />
              {tr("parent_link_code_copy")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
