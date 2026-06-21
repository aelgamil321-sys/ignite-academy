import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n-config";
import { normalizePreferredLang } from "@/lib/preferred-language";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";

export type StudentProfileRow = {
  user_id: string;
  full_name: string;
  arabic_name: string;
  english_name: string;
  email: string;
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
  profile_photo_path: string | null;
  preferred_language: Lang;
};

export type StudentProfileForm = {
  full_name: string;
  arabic_name: string;
  english_name: string;
  section?: StudentSection | null;
  islamic_group?: IslamicGroup | null;
  preferred_language?: Lang;
};

export const CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE =
  "Please complete your profile before generating certificates.";

export type StudentProfileCertificateFields = Pick<
  StudentProfileRow,
  "full_name" | "arabic_name" | "english_name"
>;

const profileSelect =
  "user_id, full_name, arabic_name, english_name, email, grade, section, islamic_group, profile_photo_path, preferred_language";

function mapProfileRow(data: {
  user_id: string;
  full_name: string | null;
  arabic_name: string | null;
  english_name: string | null;
  email: string | null;
  grade: string | null;
  section: string | null;
  islamic_group: string | null;
  profile_photo_path: string | null;
  preferred_language: string | null;
}): StudentProfileRow {
  return {
    user_id: data.user_id,
    full_name: data.full_name ?? "",
    arabic_name: data.arabic_name ?? "",
    english_name: data.english_name ?? "",
    email: data.email ?? "",
    grade: data.grade ?? "",
    section: normalizeStudentSection(data.section),
    islamic_group: normalizeIslamicGroup(data.islamic_group),
    profile_photo_path: data.profile_photo_path ?? null,
    preferred_language: normalizePreferredLang(data.preferred_language) ?? "ar",
  };
}

/** Certificate names require both English and Arabic names on the student profile. */
export function isStudentProfileComplete(
  profile: StudentProfileCertificateFields | null | undefined,
): boolean {
  return Boolean(profile?.english_name?.trim() && profile?.arabic_name?.trim());
}

export async function fetchStudentProfile(userId: string): Promise<StudentProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[student profile fetch]", error);
    throw error;
  }

  if (!data) return null;

  return mapProfileRow(data);
}

export async function saveStudentProfile(
  userId: string,
  email: string,
  form: StudentProfileForm,
): Promise<StudentProfileRow> {
  const englishName = form.english_name.trim();
  const arabicName = form.arabic_name.trim();
  const payload = {
    user_id: userId,
    email,
    full_name: form.full_name.trim() || englishName,
    arabic_name: arabicName,
    english_name: englishName,
    section: form.section ?? null,
    islamic_group: form.islamic_group ?? null,
  };

  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: payload.full_name,
        arabic_name: payload.arabic_name,
        english_name: payload.english_name,
        section: payload.section,
        islamic_group: payload.islamic_group,
        ...(form.preferred_language ? { preferred_language: form.preferred_language } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select(profileSelect)
      .single();

    if (error) {
      console.error("[student profile update]", error);
      throw error;
    }

    await syncProfileUserMetadata(form);
    return mapProfileRow(data);
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select(profileSelect)
    .single();

  if (error) {
    console.error("[student profile insert]", error);
    throw error;
  }

  await syncProfileUserMetadata(form);
  return mapProfileRow(data);
}

async function syncProfileUserMetadata(form: StudentProfileForm): Promise<void> {
  const englishName = form.english_name.trim();
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: form.full_name.trim() || englishName,
      arabic_name: form.arabic_name.trim(),
      english_name: englishName,
      ...(form.section ? { section: form.section } : {}),
      ...(form.islamic_group ? { islamic_group: form.islamic_group } : {}),
    },
  });

  if (error) {
    console.warn("[student profile metadata sync]", error);
  }
}
