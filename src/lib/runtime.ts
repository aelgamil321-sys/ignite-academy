/** True when code runs in the browser (client bundle / hydrated navigation). */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}
