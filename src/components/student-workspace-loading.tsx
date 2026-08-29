import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function StudentWorkspaceLoading({ compact = false }: { compact?: boolean }) {
  const { tr } = useI18n();

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {tr("loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm">{tr("loading")}</p>
    </div>
  );
}
