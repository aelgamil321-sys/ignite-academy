/**
 * Student identity is determined by user_roles — NOT by the presence of a profiles row.
 * Teacher/staff profiles exist for display identity only and must never be counted as students.
 */

export type UserRoleIndex = {
  roleByUser: Map<string, string>;
  adminIds: Set<string>;
  teacherIds: Set<string>;
  parentIds: Set<string>;
  studentIds: Set<string>;
};

export function buildUserRoleIndex(
  rows: Array<{ user_id: string; role: string }>,
): UserRoleIndex {
  const roleByUser = new Map<string, string>();
  const adminIds = new Set<string>();
  const teacherIds = new Set<string>();
  const parentIds = new Set<string>();
  const studentIds = new Set<string>();

  for (const row of rows) {
    roleByUser.set(row.user_id, row.role);
    if (row.role === "admin") adminIds.add(row.user_id);
    else if (row.role === "teacher") teacherIds.add(row.user_id);
    else if (row.role === "parent") parentIds.add(row.user_id);
    else if (row.role === "student") studentIds.add(row.user_id);
  }

  return { roleByUser, adminIds, teacherIds, parentIds, studentIds };
}

/** Canonical student check: user_roles.role = 'student', excluding any staff role rows. */
export function isStudentAccount(userId: string, index: UserRoleIndex): boolean {
  if (index.adminIds.has(userId) || index.teacherIds.has(userId) || index.parentIds.has(userId)) {
    return false;
  }
  return index.roleByUser.get(userId) === "student";
}

export function filterProfilesToStudents<T extends { user_id: string }>(
  profiles: T[],
  index: UserRoleIndex,
): T[] {
  return profiles.filter((profile) => isStudentAccount(profile.user_id, index));
}
