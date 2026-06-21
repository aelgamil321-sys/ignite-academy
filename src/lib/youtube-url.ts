/** Extract YouTube video id from a watch, embed, or youtu.be URL. */
export function ytId(url: string): string {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : url.trim();
}

/** True when the URL looks like a usable YouTube link. */
export function hasYoutubeUrl(url?: string | null): boolean {
  return Boolean(ytId(url ?? ""));
}
