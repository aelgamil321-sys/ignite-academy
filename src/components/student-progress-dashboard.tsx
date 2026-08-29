import { StudentAcademicProgress } from "@/components/student-academic-progress";
import { StudentBadgesSection } from "@/components/student-badges-section";
import { StudentCertificatesSection } from "@/components/student-certificates-section";
import { StudentRecentAchievementsSection } from "@/components/student-recent-achievements-section";
import type { StudentProgressData } from "@/lib/student-progress";

export function StudentProgressDashboard({
  progress,
  gradeName,
  gradeSlug,
}: {
  progress: StudentProgressData;
  gradeName: string;
  gradeSlug: string;
}) {
  return (
    <div className="space-y-6">
      <StudentAcademicProgress progress={progress} gradeName={gradeName} gradeSlug={gradeSlug} />

      <StudentBadgesSection progress={progress} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-6">
        <StudentCertificatesSection progress={progress} gradeSlug={gradeSlug} />
        <StudentRecentAchievementsSection progress={progress} gradeSlug={gradeSlug} />
      </div>
    </div>
  );
}
