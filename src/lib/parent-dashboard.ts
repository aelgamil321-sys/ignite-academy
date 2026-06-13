import type { Bi } from "@/lib/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";

export type ParentDashboardData = {
  studentName: Bi;
  gradeSlug: string;
  progress: StudentProgressData;
};

export async function fetchParentDashboardData(userId: string): Promise<{
  data: ParentDashboardData | null;
  error: string | null;
}> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, arabic_name, english_name, grade")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  const { data: progress, error: progressError } = await fetchStudentProgress(userId);
  if (progressError) {
    return { data: null, error: progressError };
  }
  if (!progress) {
    return { data: null, error: "Progress data unavailable." };
  }

  const fullName = profile?.full_name?.trim() || "Student";
  const studentName: Bi = {
    en: profile?.english_name?.trim() || fullName,
    ar: profile?.arabic_name?.trim() || fullName,
  };

  return {
    data: {
      studentName,
      gradeSlug: progress.gradeSlug,
      progress,
    },
    error: null,
  };
}
