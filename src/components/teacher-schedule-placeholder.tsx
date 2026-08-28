import { CalendarClock } from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import { useI18n } from "@/lib/i18n";

export function TeacherSchedulePlaceholder() {
  const { tr } = useI18n();

  return (
    <TeacherDashboardSection
      title={tr("teacher_dash_schedule_title")}
      icon={<CalendarClock className="h-5 w-5" />}
    >
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-dark/10 text-brand-dark">
          <CalendarClock className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{tr("teacher_dash_schedule_empty")}</p>
      </div>
    </TeacherDashboardSection>
  );
}
