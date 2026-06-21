/** Extract normalized 11-char YouTube video id, or empty if not a YouTube link. */
export function extractYoutubeVideoId(url?: string | null): string {
  if (!url?.trim()) return "";
  const m = url.trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : "";
}

/** @deprecated Use extractYoutubeVideoId */
export function ytId(url: string): string {
  return extractYoutubeVideoId(url);
}

/** True when the URL contains a recognizable YouTube video id. */
export function hasYoutubeUrl(url?: string | null): boolean {
  return Boolean(extractYoutubeVideoId(url));
}
