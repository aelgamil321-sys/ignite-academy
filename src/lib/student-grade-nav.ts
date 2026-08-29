export type StudentGradeSearch = {
  view?: "quizzes";
};

export function studentGradeSearch(search: Record<string, unknown>): StudentGradeSearch {
  return search.view === "quizzes" ? { view: "quizzes" } : {};
}

export function studentGradePath(gradeSlug: string): string {
  return `/grades/${gradeSlug}`;
}

export function isStudentQuizzesNav(
  pathname: string,
  hash: string,
  search: StudentGradeSearch,
  gradeSlug: string,
): boolean {
  if (!gradeSlug) return false;
  const base = studentGradePath(gradeSlug);
  const normalizedHash = hash.replace(/^#/, "");

  if (pathname === base || pathname === `${base}/`) {
    return search.view === "quizzes";
  }

  if (pathname.startsWith(`${base}/`)) {
    return normalizedHash === "lesson-quiz" || normalizedHash === "lesson-result";
  }

  return false;
}

export function isStudentLessonsNav(
  pathname: string,
  hash: string,
  search: StudentGradeSearch,
  gradeSlug: string,
): boolean {
  if (!gradeSlug) return false;
  const base = studentGradePath(gradeSlug);
  if (!pathname.startsWith(base)) return false;
  return !isStudentQuizzesNav(pathname, hash, search, gradeSlug);
}
