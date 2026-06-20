import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export type AiActionStatus =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function AiActionBanner({ status }: { status: AiActionStatus }) {
  if (status.kind === "idle") return null;

  const styles =
    status.kind === "loading"
      ? "border-primary/30 bg-primary/5 text-primary"
      : status.kind === "success"
        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
        : "border-destructive/30 bg-destructive/5 text-destructive";

  const icon: ReactNode =
    status.kind === "loading" ? (
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
    ) : status.kind === "success" ? (
      <CheckCircle2 className="h-4 w-4 shrink-0" />
    ) : (
      <AlertCircle className="h-4 w-4 shrink-0" />
    );

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${styles}`}
    >
      {icon}
      <span className="[overflow-wrap:anywhere]">{status.message}</span>
    </div>
  );
}
