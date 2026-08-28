import {
  ANALYTICS_UNSET_KEY,
  type AdminAnalyticsSnapshot,
  type AnalyticsGroupRow,
  type AtRiskStudentRow,
  type IslamicGroupCard,
  type StudentLeaderboardRow,
} from "@/lib/admin-analytics";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { L, type Lang } from "@/lib/i18n";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import { formatClassScopeLabel } from "@/lib/teacher-dashboard";
import type { TeacherAnalyticsScope } from "@/lib/teacher-analytics";

export function formatAnalyticsPct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export function leaderboardStudentName(
  row: StudentLeaderboardRow | AtRiskStudentRow,
  lang: Lang,
): string {
  if ("arabicName" in row) {
    return lang === "ar" ? row.arabicName : row.englishName;
  }
  return lang === "ar" ? row.nameAr : row.nameEn;
}

export function teacherAllowedSectionOptions(
  scope: TeacherAnalyticsScope,
  grade: string,
): StudentSection[] {
  if (scope.isLeadTeacher) return [...STUDENT_SECTIONS];

  const gradeNorm = grade ? normalizeGradeSlug(grade) : "";
  const relevant = gradeNorm
    ? scope.assignments.filter((a) => normalizeGradeSlug(a.grade) === gradeNorm)
    : scope.assignments;

  if (relevant.length === 0) return [];

  const allowAll = relevant.some((a) => a.section === null);
  if (allowAll) return [...STUDENT_SECTIONS];

  const sections = [
    ...new Set(relevant.map((a) => a.section).filter((s): s is StudentSection => s !== null)),
  ];
  return sections.sort((a, b) => STUDENT_SECTIONS.indexOf(a) - STUDENT_SECTIONS.indexOf(b));
}

export function teacherAllowedIslamicGroupOptions(
  scope: TeacherAnalyticsScope,
  grade: string,
  section: string,
): IslamicGroup[] {
  if (scope.isLeadTeacher) return [...ISLAMIC_GROUPS];

  let relevant = scope.assignments;
  if (grade) {
    const gradeNorm = normalizeGradeSlug(grade);
    relevant = relevant.filter((a) => normalizeGradeSlug(a.grade) === gradeNorm);
  }
  if (section) {
    relevant = relevant.filter((a) => a.section === null || a.section === section);
  }
  if (relevant.length === 0) return [];

  const allowAll = relevant.some((a) => a.islamic_group === null);
  if (allowAll) return [...ISLAMIC_GROUPS];

  const groups = [
    ...new Set(
      relevant.map((a) => a.islamic_group).filter((g): g is IslamicGroup => g !== null),
    ),
  ];
  return groups.sort((a, b) => ISLAMIC_GROUPS.indexOf(a) - ISLAMIC_GROUPS.indexOf(b));
}

function filterSectionRowsForScope(
  bySection: AnalyticsGroupRow[],
  scope: TeacherAnalyticsScope,
): AnalyticsGroupRow[] {
  if (scope.isLeadTeacher) {
    return bySection.filter((row) => row.key !== ANALYTICS_UNSET_KEY);
  }

  const allowedSections = new Set<StudentSection>();
  let allowAllSections = false;
  for (const assignment of scope.assignments) {
    if (assignment.section === null) allowAllSections = true;
    else allowedSections.add(assignment.section);
  }

  return bySection.filter((row) => {
    if (row.key === ANALYTICS_UNSET_KEY) return false;
    if (allowAllSections) return true;
    return allowedSections.has(row.key as StudentSection);
  });
}

export function filterIslamicGroupCardsForScope(
  snapshot: AdminAnalyticsSnapshot,
  scope: TeacherAnalyticsScope,
): IslamicGroupCard[] {
  return snapshot.islamicGroupCards.filter((card) => {
    if (card.studentCount === 0) return false;
    if (scope.isLeadTeacher) return true;
    return scope.assignments.some(
      (assignment) =>
        assignment.islamic_group === null || assignment.islamic_group === card.group,
    );
  });
}

export type TeacherPreviewBar = {
  label: string;
  score: number;
  studentCount: number;
  hasData: boolean;
};

function rowToPreviewBar(row: AnalyticsGroupRow, lang: Lang): TeacherPreviewBar {
  return {
    label: L(row.labelEn, row.labelAr)[lang],
    score: row.averageScorePct ?? 0,
    studentCount: row.studentCount,
    hasData: row.averageScorePct !== null,
  };
}

export function buildTeacherPreviewComparisonBars(
  snapshot: AdminAnalyticsSnapshot,
  scope: TeacherAnalyticsScope,
  lang: Lang,
): TeacherPreviewBar[] {
  const assignedGrades = scope.isLeadTeacher
    ? new Set(
        snapshot.byGrade
          .filter((row) => row.key !== ANALYTICS_UNSET_KEY && row.studentCount > 0)
          .map((row) => row.key),
      )
    : new Set(scope.assignments.map((assignment) => normalizeGradeSlug(assignment.grade)));

  const singleGrade = assignedGrades.size <= 1;

  if (singleGrade) {
    const sectionRows = filterSectionRowsForScope(snapshot.bySection, scope).filter(
      (row) => row.studentCount > 0,
    );
    if (sectionRows.length > 1) {
      return sectionRows.slice(0, 4).map((row) => rowToPreviewBar(row, lang));
    }
  }

  if (assignedGrades.size > 1) {
    const gradeRows = snapshot.byGrade.filter(
      (row) =>
        row.key !== ANALYTICS_UNSET_KEY &&
        assignedGrades.has(row.key) &&
        row.studentCount > 0,
    );
    if (gradeRows.length > 0) {
      return gradeRows.slice(0, 4).map((row) => rowToPreviewBar(row, lang));
    }
  }

  const islamicCards = filterIslamicGroupCardsForScope(snapshot, scope);
  if (islamicCards.length > 0) {
    return islamicCards.slice(0, 4).map((card) => ({
      label: L(card.labelEn, card.labelAr)[lang],
      score: card.averageScorePct ?? 0,
      studentCount: card.studentCount,
      hasData: card.averageScorePct !== null,
    }));
  }

  const sectionRows = filterSectionRowsForScope(snapshot.bySection, scope).filter(
    (row) => row.studentCount > 0,
  );
  if (sectionRows.length > 0) {
    return sectionRows.slice(0, 4).map((row) => rowToPreviewBar(row, lang));
  }

  const gradeRow = snapshot.byGrade.find((row) => row.studentCount > 0);
  if (gradeRow) return [rowToPreviewBar(gradeRow, lang)];

  return [];
}

export type TeacherClassComparisonRow = {
  label: string;
  studentCount: number;
  averageScorePct: number | null;
  hasData: boolean;
};

export function buildTeacherClassComparisonRows(
  snapshot: AdminAnalyticsSnapshot,
  scope: TeacherAnalyticsScope,
  lang: Lang,
): TeacherClassComparisonRow[] {
  if (scope.isLeadTeacher) {
    return snapshot.byGrade
      .filter((row) => row.key !== ANALYTICS_UNSET_KEY && row.studentCount > 0)
      .map((row) => ({
        label: L(row.labelEn, row.labelAr)[lang],
        studentCount: row.studentCount,
        averageScorePct: row.averageScorePct,
        hasData: row.averageScorePct !== null,
      }));
  }

  if (scope.assignments.length === 0) return [];

  const uniqueGrades = new Set(
    scope.assignments.map((assignment) => normalizeGradeSlug(assignment.grade)),
  );

  if (uniqueGrades.size > 1) {
    return snapshot.byGrade
      .filter(
        (row) =>
          row.key !== ANALYTICS_UNSET_KEY &&
          uniqueGrades.has(row.key) &&
          row.studentCount > 0,
      )
      .map((row) => ({
        label: L(row.labelEn, row.labelAr)[lang],
        studentCount: row.studentCount,
        averageScorePct: row.averageScorePct,
        hasData: row.averageScorePct !== null,
      }));
  }

  const sectionRows = filterSectionRowsForScope(snapshot.bySection, scope).filter(
    (row) => row.studentCount > 0,
  );
  if (sectionRows.length > 1) {
    return sectionRows.map((row) => ({
      label: L(row.labelEn, row.labelAr)[lang],
      studentCount: row.studentCount,
      averageScorePct: row.averageScorePct,
      hasData: row.averageScorePct !== null,
    }));
  }

  const islamicCards = filterIslamicGroupCardsForScope(snapshot, scope);
  if (islamicCards.length > 1) {
    return islamicCards.map((card) => ({
      label: L(card.labelEn, card.labelAr)[lang],
      studentCount: card.studentCount,
      averageScorePct: card.averageScorePct,
      hasData: card.averageScorePct !== null,
    }));
  }

  if (scope.assignments.length > 1) {
    return scope.assignments.map((assignment) => {
      const gradeKey = normalizeGradeSlug(assignment.grade);
      const sectionRow = assignment.section
        ? snapshot.bySection.find((row) => row.key === assignment.section)
        : null;
      const gradeRow = snapshot.byGrade.find((row) => row.key === gradeKey);
      const source = sectionRow ?? gradeRow;
      return {
        label: formatClassScopeLabel(assignment, lang),
        studentCount: source?.studentCount ?? 0,
        averageScorePct: source?.averageScorePct ?? null,
        hasData: source?.averageScorePct !== null,
      };
    });
  }

  if (sectionRows.length === 1) {
    const row = sectionRows[0];
    return [
      {
        label: L(row.labelEn, row.labelAr)[lang],
        studentCount: row.studentCount,
        averageScorePct: row.averageScorePct,
        hasData: row.averageScorePct !== null,
      },
    ];
  }

  if (islamicCards.length === 1) {
    const card = islamicCards[0];
    return [
      {
        label: L(card.labelEn, card.labelAr)[lang],
        studentCount: card.studentCount,
        averageScorePct: card.averageScorePct,
        hasData: card.averageScorePct !== null,
      },
    ];
  }

  const gradeKey = normalizeGradeSlug(scope.assignments[0].grade);
  const gradeRow = snapshot.byGrade.find((row) => row.key === gradeKey);
  if (gradeRow && gradeRow.studentCount > 0) {
    return [
      {
        label: formatClassScopeLabel(scope.assignments[0], lang),
        studentCount: gradeRow.studentCount,
        averageScorePct: gradeRow.averageScorePct,
        hasData: gradeRow.averageScorePct !== null,
      },
    ];
  }

  return [];
}

export function formatTeacherScopeSummary(
  scope: TeacherAnalyticsScope,
  lang: Lang,
): string {
  if (scope.isLeadTeacher) {
    return L("Islamic Department — all grades", "قسم الدراسات الإسلامية — كل الصفوف")[lang];
  }
  if (scope.assignments.length === 0) {
    return L("No classes assigned", "لا توجد صفوف مكلّفة")[lang];
  }
  const labels = scope.assignments.map((assignment) => formatClassScopeLabel(assignment, lang));
  if (labels.length <= 3) return labels.join(" · ");
  return `${labels.slice(0, 2).join(" · ")} · ${L(`+${labels.length - 2} more`, `+${labels.length - 2} أخرى`)[lang]}`;
}
