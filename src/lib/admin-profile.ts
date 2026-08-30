import { supabase } from "@/integrations/supabase/client";
import { fetchTeacherDisplayName, resolveTeacherDisplayName } from "@/lib/teacher-identity";

export type AdminProfileSummary = {
  userId: string;
  email: string;
  fullName: string;
  profilePhotoPath: string | null;
};

export async function fetchAdminProfileSummary(
  userId: string,
  emailFallback = "",
): Promise<AdminProfileSummary> {
  const [profileRes, requestRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, english_name, arabic_name, email, profile_photo_path")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("teacher_requests").select("full_name, email").eq("user_id", userId).maybeSingle(),
  ]);

  const profile = profileRes.data;
  const request = requestRes.data;
  let fullName = resolveTeacherDisplayName(userId, {
    full_name: profile?.full_name ?? request?.full_name,
    english_name: profile?.english_name,
    arabic_name: profile?.arabic_name,
    email: profile?.email ?? request?.email ?? emailFallback,
  });
  if (fullName === "—") {
    fullName = (await fetchTeacherDisplayName(userId)) || emailFallback;
  }

  return {
    userId,
    email: profile?.email ?? request?.email ?? emailFallback,
    fullName,
    profilePhotoPath: profile?.profile_photo_path ?? null,
  };
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
