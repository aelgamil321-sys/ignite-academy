import { supabase } from "@/integrations/supabase/client";

export type StudentProfileRow = {
  user_id: string;
  full_name: string;
  arabic_name: string;
  english_name: string;
  email: string;
  grade: string;
};

export type StudentProfileForm = {
  full_name: string;
  arabic_name: string;
  english_name: string;
};

export const CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE =
  "Please complete your profile before generating certificates.";

export type StudentProfileCertificateFields = Pick<
  StudentProfileRow,
  "full_name" | "arabic_name" | "english_name"
>;

/** Certificate names require both English and Arabic names on the student profile. */
export function isStudentProfileComplete(
  profile: StudentProfileCertificateFields | null | undefined,
): boolean {
  return Boolean(profile?.english_name?.trim() && profile?.arabic_name?.trim());
}

export async function fetchStudentProfile(userId: string): Promise<StudentProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, arabic_name, english_name, email, grade")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[student profile fetch]", error);
    throw error;
  }

  if (!data) return null;

  return {
    user_id: data.user_id,
    full_name: data.full_name ?? "",
    arabic_name: data.arabic_name ?? "",
    english_name: data.english_name ?? "",
    email: data.email ?? "",
    grade: data.grade ?? "",
  };
}

export async function saveStudentProfile(
  userId: string,
  email: string,
  form: StudentProfileForm,
): Promise<StudentProfileRow> {
  const payload = {
    user_id: userId,
    email,
    full_name: form.full_name.trim(),
    arabic_name: form.arabic_name.trim(),
    english_name: form.english_name.trim(),
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
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("user_id, full_name, arabic_name, english_name, email, grade")
      .single();

    if (error) {
      console.error("[student profile update]", error);
      throw error;
    }

    await syncProfileUserMetadata(form);
    return data as StudentProfileRow;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("user_id, full_name, arabic_name, english_name, email, grade")
    .single();

  if (error) {
    console.error("[student profile insert]", error);
    throw error;
  }

  await syncProfileUserMetadata(form);
  return data as StudentProfileRow;
}

async function syncProfileUserMetadata(form: StudentProfileForm): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: form.full_name.trim(),
      arabic_name: form.arabic_name.trim(),
      english_name: form.english_name.trim(),
    },
  });

  if (error) {
    console.warn("[student profile metadata sync]", error);
  }
}
