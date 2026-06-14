import { supabase } from "@/integrations/supabase/client";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ALLOWED_MIME_TYPES = new Set(PROFILE_PHOTO_ACCEPT.split(","));

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function validateProfilePhotoFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Please choose a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return "Profile photo must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const validationError = validateProfilePhotoFile(file);
  if (validationError) throw new Error(validationError);

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name) || `photo.${ext}`}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: "3600",
    });

  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      profile_photo_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) throw new Error(`Could not save profile photo: ${profileError.message}`);

  return path;
}

export async function getProfilePhotoSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  const trimmed = path?.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("[profile photo signed url]", error?.message ?? "missing url");
    return null;
  }

  return data.signedUrl;
}
