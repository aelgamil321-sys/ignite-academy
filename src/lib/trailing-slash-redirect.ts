/**
 * TanStack Start SSR matches nested/index routes under layout parents using trailing-slash
 * paths (e.g. `/teacher/` not `/teacher`, `/teacher/classes/` not `/teacher/classes`).
 * Cold loads without the slash throw HTTPError → 500. Normalize before SSR.
 */
export function trailingSlashRedirectResponse(url: URL): Response | null {
  const pathname = url.pathname;

  if (pathname.endsWith("/")) return null;

  const needsTrailingSlash =
    pathname === "/teacher" ||
    pathname === "/student" ||
    pathname.startsWith("/teacher/") ||
    pathname.startsWith("/student/");

  if (!needsTrailingSlash) return null;

  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return null;

  const target = new URL(url);
  target.pathname = `${pathname}/`;
  return Response.redirect(target, 308);
}
