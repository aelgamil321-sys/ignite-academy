export const PARENT_NAV_ANCHORS = {
  progress: "parent-progress",
  assignments: "parent-assignments",
  achievements: "parent-achievements",
} as const;

export type ParentNavAnchor = (typeof PARENT_NAV_ANCHORS)[keyof typeof PARENT_NAV_ANCHORS];

export function isParentDashboardPath(pathname: string): boolean {
  return pathname === "/parent/dashboard" || pathname === "/parent/dashboard/";
}

export function isParentDashboardNav(pathname: string, hash: string): boolean {
  if (!isParentDashboardPath(pathname)) return false;
  const normalized = hash.replace(/^#/, "");
  return !normalized || !Object.values(PARENT_NAV_ANCHORS).includes(normalized as ParentNavAnchor);
}

export function isParentProgressNav(pathname: string, hash: string): boolean {
  return isParentDashboardPath(pathname) && hash.replace(/^#/, "") === PARENT_NAV_ANCHORS.progress;
}

export function isParentAssignmentsNav(pathname: string, hash: string): boolean {
  return isParentDashboardPath(pathname) && hash.replace(/^#/, "") === PARENT_NAV_ANCHORS.assignments;
}

export function isParentAchievementsNav(pathname: string, hash: string): boolean {
  return isParentDashboardPath(pathname) && hash.replace(/^#/, "") === PARENT_NAV_ANCHORS.achievements;
}

export function isParentAnnouncementsNav(pathname: string): boolean {
  return (
    pathname === "/parent/announcements" ||
    pathname === "/parent/announcements/" ||
    pathname.startsWith("/parent/announcements/")
  );
}

export function isParentGuidesNav(pathname: string): boolean {
  return (
    pathname === "/parent/guides" ||
    pathname === "/parent/guides/" ||
    pathname.startsWith("/parent/guides/")
  );
}

export function scrollToParentAnchor(anchorId: string): boolean {
  const target = document.getElementById(anchorId);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}
