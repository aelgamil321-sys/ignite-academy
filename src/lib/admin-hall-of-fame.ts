import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { grades } from "@/lib/curriculum";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";
import { hallOfFameStudentDisplayName } from "@/lib/hall-of-fame";

export type AdminHallOfFameStudent = {
  userId: string;
  displayName: string;
  arabicName: string;
  grade: string | null;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
  profilePhotoPath: string | null;
  averageScorePct: number;
  certificatesEarned: number;
};

export type AdminHallOfFameGradeChampion = AdminHallOfFameStudent & {
  gradeSlug: string;
};

export type AdminHallOfFameData = {
  topStudents: AdminHallOfFameStudent[];
  studentOfMonth: AdminHallOfFameStudent | null;
  gradeChampions: AdminHallOfFameGradeChampion[];
};

type RpcStudent = {
  user_id?: string | null;
  english_name?: string | null;
  full_name?: string | null;
  arabic_name?: string | null;
  grade?: string | null;
  section?: string | null;
  islamic_group?: string | null;
  profile_photo_path?: string | null;
  average_score_pct?: number | null;
  certificates_earned?: number | null;
};

function normalizeIslamicGroup(value: string | null | undefined): IslamicGroup | null {
  const v = (value ?? "").trim().toUpperCase();
  return v === "A" || v === "B" ? v : null;
}

function normalizeSection(value: string | null | undefined): StudentSection | null {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "A" || v === "B" || v === "C" || v === "D" || v === "E" || v === "F") {
    return v;
  }
  return null;
}

function mapStudent(row: RpcStudent | null | undefined): AdminHallOfFameStudent | null {
  if (!row || !row.user_id || row.average_score_pct == null) return null;

  return {
    userId: row.user_id,
    displayName: hallOfFameStudentDisplayName(row),
    arabicName: row.arabic_name?.trim() || "—",
    grade: row.grade?.trim() || null,
    section: normalizeSection(row.section),
    islamicGroup: normalizeIslamicGroup(row.islamic_group),
    profilePhotoPath: row.profile_photo_path?.trim() || null,
    averageScorePct: row.average_score_pct,
    certificatesEarned: row.certificates_earned ?? 0,
  };
}

function gradeSortKey(slug: string): number {
  const normalized = normalizeGradeSlug(slug);
  const index = grades.findIndex((g) => g.slug === normalized);
  return index >= 0 ? index : 999;
}

export async function fetchAdminHallOfFame(): Promise<AdminHallOfFameData> {
  const { data, error } = await supabase.rpc("get_admin_hall_of_fame");

  if (error) {
    throw new Error(error.message);
  }

  const payload = (data ?? {}) as {
    top_students?: RpcStudent[];
    student_of_month?: RpcStudent | null;
    grade_champions?: RpcGradeChampion[];
  };

  const topStudents = (payload.top_students ?? [])
    .map((row) => mapStudent(row))
    .filter((row): row is AdminHallOfFameStudent => row !== null);

  const studentOfMonth = mapStudent(payload.student_of_month);

  const gradeChampions = (payload.grade_champions ?? [])
    .map((row) => {
      const student = mapStudent(row);
      if (!student || !row.grade) return null;
      return {
        ...student,
        gradeSlug: normalizeGradeSlug(row.grade),
      };
    })
    .filter((row): row is AdminHallOfFameGradeChampion => row !== null)
    .sort((a, b) => gradeSortKey(a.gradeSlug) - gradeSortKey(b.gradeSlug));

  return {
    topStudents,
    studentOfMonth,
    gradeChampions,
  };
}
