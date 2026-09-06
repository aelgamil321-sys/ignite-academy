import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { grades } from "@/lib/curriculum";
import type { IslamicGroup } from "@/lib/student-academics";

/** Canonical English display name for Honor Board (UI locale independent). */
export function hallOfFameStudentDisplayName(input: {
  english_name?: string | null;
  full_name?: string | null;
  arabic_name?: string | null;
}): string {
  return (
    input.english_name?.trim() ||
    input.full_name?.trim() ||
    input.arabic_name?.trim() ||
    "—"
  );
}

export type HallOfFameStudent = {
  /** Always the student's English name for Honor Board display. */
  displayName: string;
  arabicName: string;
  grade: string | null;
  islamicGroup: IslamicGroup | null;
  profilePhotoPath: string | null;
  averageScorePct: number;
  certificatesEarned: number;
};

export type HallOfFameGradeChampion = HallOfFameStudent & {
  gradeSlug: string;
};

export type HallOfFameData = {
  topStudents: HallOfFameStudent[];
  studentOfMonth: HallOfFameStudent | null;
  gradeChampions: HallOfFameGradeChampion[];
};

type RpcStudent = {
  english_name?: string | null;
  full_name?: string | null;
  arabic_name?: string | null;
  grade?: string | null;
  islamic_group?: string | null;
  profile_photo_path?: string | null;
  average_score_pct?: number | null;
  certificates_earned?: number | null;
};

type RpcGradeChampion = RpcStudent & {
  grade?: string | null;
};

function normalizeIslamicGroup(value: string | null | undefined): IslamicGroup | null {
  const v = (value ?? "").trim().toUpperCase();
  return v === "A" || v === "B" ? v : null;
}

function mapStudent(row: RpcStudent | null | undefined): HallOfFameStudent | null {
  if (!row || row.average_score_pct == null) return null;

  return {
    displayName: hallOfFameStudentDisplayName(row),
    arabicName: row.arabic_name?.trim() || "—",
    grade: row.grade?.trim() || null,
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

export async function fetchHallOfFame(): Promise<HallOfFameData> {
  const { data, error } = await supabase.rpc("get_hall_of_fame");

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
    .filter((row): row is HallOfFameStudent => row !== null);

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
    .filter((row): row is HallOfFameGradeChampion => row !== null)
    .sort((a, b) => gradeSortKey(a.gradeSlug) - gradeSortKey(b.gradeSlug));

  return {
    topStudents,
    studentOfMonth,
    gradeChampions,
  };
}
