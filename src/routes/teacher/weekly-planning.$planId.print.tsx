import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { WeeklyPlanPrintDocument } from "@/components/weekly-plan-print-document";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import { buildWeeklyPlanDocumentModel } from "@/lib/weekly-plan-document-model";
import { waitForWeeklyPlanDocumentReady } from "@/lib/weekly-plan-pdf";
import { fetchWeeklyPlanById, type WeeklyPlanRow } from "@/lib/weekly-planning";

export const Route = createFileRoute("/teacher/weekly-planning/$planId/print")({
  component: TeacherWeeklyPlanPrintPage,
});

function TeacherWeeklyPlanPrintPage() {
  const { planId } = Route.useParams();
  const { tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<WeeklyPlanRow | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [documentReady, setDocumentReady] = useState(false);
  const [printing, setPrinting] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setError(tr("wp_not_found"));
          return;
        }
        const [ctx, row] = await Promise.all([
          fetchTeacherContext(data.user.id),
          fetchWeeklyPlanById(planId),
        ]);
        setTeacherName(ctx.fullName);
        setPlan(row);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [planId, tr]);

  const documentModel = useMemo(() => {
    if (!plan) return null;
    return buildWeeklyPlanDocumentModel(plan, { teacherDisplayName: teacherName || "—" });
  }, [plan, teacherName]);

  useEffect(() => {
    if (!documentModel || !docRef.current) return;
    setDocumentReady(false);
    void waitForWeeklyPlanDocumentReady(docRef.current).then(() => setDocumentReady(true));
  }, [documentModel]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const root = docRef.current;
      if (root) await waitForWeeklyPlanDocumentReady(root);
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (error || !plan || !documentModel) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">{error ?? tr("wp_not_found")}</p>
        <Link
          to="/teacher/weekly-planning"
          className="text-sm font-medium text-primary hover:underline"
        >
          {tr("wp_back_to_list")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          .no-print { display: none !important; }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .wp-print-shell {
            padding: 0 !important;
            max-width: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 shadow-sm">
        <Link
          to="/teacher/weekly-planning/$planId"
          params={{ planId }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {tr("wp_back_to_plan")}
        </Link>
        <button
          type="button"
          disabled={!documentReady || printing}
          onClick={() => void handlePrint()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {printing || !documentReady ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          {tr("wp_print_button")}
        </button>
      </div>
      <div ref={docRef} className="wp-print-shell mx-auto bg-white">
        <WeeklyPlanPrintDocument model={documentModel} />
      </div>
    </div>
  );
}
