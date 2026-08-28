/**
 * Department Weekly Planning dashboard tests — section coverage model.
 */

import type { TeacherAssignmentRow } from "@/lib/admin-teachers";
import {
  buildDepartmentWeeklyPlanningSnapshot,
  deriveExpectedSlotStatus,
  deriveTeacherPlanningScopes,
  expectedScopeKey,
  filterDepartmentTrackerRows,
  planSlotKey,
  unionPlanSections,
  type DepartmentTeacherProfile,
} from "@/lib/weekly-planning-dashboard";
import {
  calculateWeeklyPlanCompletion,
  weeklyPlanSectionsKey,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";

export type WeeklyPlanDashboardTestResult = { name: string; pass: boolean; detail: string };

function assignment(
  partial: Partial<TeacherAssignmentRow> & Pick<TeacherAssignmentRow, "teacher_id" | "grade">,
): TeacherAssignmentRow {
  return {
    id: partial.id ?? "a1",
    teacher_id: partial.teacher_id,
    grade: partial.grade,
    section: partial.section ?? null,
    islamic_group: partial.islamic_group ?? "A",
    created_at: partial.created_at ?? "",
  };
}

function teacherProfile(
  partial: Partial<DepartmentTeacherProfile> & Pick<DepartmentTeacherProfile, "userId" | "fullName">,
): DepartmentTeacherProfile {
  const assignments = partial.assignments ?? [
    assignment({ teacher_id: partial.userId, grade: "10", section: "A", islamic_group: "A" }),
    assignment({ id: "a2", teacher_id: partial.userId, grade: "10", section: "B", islamic_group: "A" }),
  ];
  return {
    userId: partial.userId,
    fullName: partial.fullName,
    email: partial.email ?? "",
    isLeadTeacher: partial.isLeadTeacher ?? false,
    assignments,
    scopes: partial.scopes ?? deriveTeacherPlanningScopes(assignments),
  };
}

function teacherWithSectionsAbcd(userId: string, fullName: string): DepartmentTeacherProfile {
  const assignments = [
    assignment({ id: "a1", teacher_id: userId, grade: "10", section: "A", islamic_group: "B" }),
    assignment({ id: "a2", teacher_id: userId, grade: "10", section: "B", islamic_group: "B" }),
    assignment({ id: "a3", teacher_id: userId, grade: "10", section: "C", islamic_group: "B" }),
    assignment({ id: "a4", teacher_id: userId, grade: "10", section: "D", islamic_group: "B" }),
  ];
  return teacherProfile({ userId, fullName, assignments });
}

function completePlanRow(
  partial: Partial<WeeklyPlanRow> & Pick<WeeklyPlanRow, "id" | "teacher_id">,
): WeeklyPlanRow {
  return {
    plan_language: "en",
    week_number: 4,
    academic_year: "2026-2027",
    phase: "High",
    grade: "10",
    section: partial.section ?? "A",
    sections: partial.sections ?? ["A", "B", "C", "D"],
    islamic_group: "B",
    student_count: 20,
    day: "Monday",
    plan_date: "2026-09-01",
    subject: "Islamic Education",
    domain: "Domain",
    success_criterion: "SC",
    learning_outcomes: "Outcomes",
    unit: "Unit 1",
    lesson_title: "Lesson",
    uae_culture: "UAE",
    cross_curricular_real_life: "Links",
    p21_skills: ["skill"],
    key_vocabulary: "vocab",
    resources: "res",
    differentiation_sod: { student_ids: [], student_names_snapshot: [], notes: "n" },
    differentiation_eal: { student_ids: [], student_names_snapshot: [], notes: "n" },
    differentiation_gt: { student_ids: [], student_names_snapshot: [], notes: "n" },
    differentiation_emirati: { student_ids: [], student_names_snapshot: [], notes: "n" },
    first_period: {
      do_now: "dn",
      i_do: "i",
      we_do: "w",
      mid_assessment: "m",
      you_do: { developing: "d", securing: "s", mastering: "m", extension: "e" },
      exit_ticket: "e",
      sir_method: "Self",
      homework: "h",
      learning_objective_success_criteria: "o",
    },
    second_period: {
      do_now: "dn2",
      i_do: "i2",
      we_do: "w2",
      mid_assessment: "m2",
      you_do: { developing: "d2", securing: "s2", mastering: "m2", extension: "e2" },
      exit_ticket: "e2",
      sir_method: "Peer",
      homework: "h2",
      learning_objective_success_criteria: "o2",
    },
    teacher_reflection: "Reflection with enough teacher content.",
    status: "complete",
    completion_percentage: 1,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function incompletePlanRow(
  partial: Partial<WeeklyPlanRow> & Pick<WeeklyPlanRow, "id" | "teacher_id">,
): WeeklyPlanRow {
  const plan = completePlanRow(partial);
  return {
    ...plan,
    domain: null,
    unit: null,
    lesson_title: null,
    success_criterion: null,
    learning_outcomes: null,
    uae_culture: null,
    cross_curricular_real_life: null,
    key_vocabulary: null,
    resources: null,
    first_period: {
      do_now: null,
      i_do: null,
      we_do: null,
      mid_assessment: null,
      you_do: { developing: null, securing: null, mastering: null, extension: null },
      exit_ticket: null,
      sir_method: null,
      homework: null,
      learning_objective_success_criteria: null,
    },
    second_period: plan.second_period,
    teacher_reflection: null,
    status: "in_progress",
    completion_percentage: 0.5,
  };
}

function expectedSlotRow(
  snapshot: ReturnType<typeof buildDepartmentWeeklyPlanningSnapshot>,
  teacherId: string,
  week: number,
) {
  return snapshot.trackerRows.find(
    (r) =>
      r.rowKind === "expected_slot" &&
      r.teacher_id === teacherId &&
      r.week_number === week,
  );
}

export function runWeeklyPlanDashboardTests(): WeeklyPlanDashboardTestResult[] {
  const abcdTeacher = teacherWithSectionsAbcd("t1", "Teacher Ahmed");
  const expectedSections = ["A", "B", "C", "D"] as const;
  const week = 4;

  const planFull = completePlanRow({
    id: "p-full",
    teacher_id: "t1",
    sections: ["A", "B", "C", "D"],
    section: "A",
  });
  const planAb = completePlanRow({
    id: "p-ab",
    teacher_id: "t1",
    sections: ["A", "B"],
    section: "A",
    lesson_title: "Plan AB",
  });
  const planCd = completePlanRow({
    id: "p-cd",
    teacher_id: "t1",
    sections: ["C", "D"],
    section: "C",
    lesson_title: "Plan CD",
  });
  const planAbc = completePlanRow({
    id: "p-abc",
    teacher_id: "t1",
    sections: ["A", "B", "C"],
    section: "A",
    lesson_title: "Plan ABC",
  });
  const planCdOverlap = completePlanRow({
    id: "p-cd2",
    teacher_id: "t1",
    sections: ["C", "D"],
    section: "C",
    lesson_title: "Plan CD overlap",
  });
  const planIncomplete = incompletePlanRow({
    id: "p-inc",
    teacher_id: "t1",
    sections: ["C", "D"],
    section: "C",
  });

  const snapshotA = buildDepartmentWeeklyPlanningSnapshot([abcdTeacher], [planFull]);
  const rowA = expectedSlotRow(snapshotA, "t1", week);

  const snapshotB = buildDepartmentWeeklyPlanningSnapshot([abcdTeacher], [planAb, planCd]);
  const rowB = expectedSlotRow(snapshotB, "t1", week);

  const snapshotC = buildDepartmentWeeklyPlanningSnapshot([abcdTeacher], [planAb]);
  const rowC = expectedSlotRow(snapshotC, "t1", week);

  const snapshotD = buildDepartmentWeeklyPlanningSnapshot([abcdTeacher], []);
  const rowD = expectedSlotRow(snapshotD, "t1", week);

  const snapshotE = buildDepartmentWeeklyPlanningSnapshot([abcdTeacher], [planAbc, planCdOverlap]);
  const rowE = expectedSlotRow(snapshotE, "t1", week);
  const overlapUnion = unionPlanSections([planAbc, planCdOverlap]);

  const snapshotF = buildDepartmentWeeklyPlanningSnapshot([abcdTeacher], [planAbc, planIncomplete]);
  const rowF = expectedSlotRow(snapshotF, "t1", week);

  const legacyTeacher = teacherProfile({ userId: "t2", fullName: "Teacher Two" });
  const legacySubmitted = completePlanRow({
    id: "p-legacy",
    teacher_id: "t2",
    week_number: 2,
    sections: ["A", "B"],
    section: "A",
    islamic_group: "A",
  });
  const legacySnapshot = buildDepartmentWeeklyPlanningSnapshot([legacyTeacher], [legacySubmitted]);
  const sectionBFilter = filterDepartmentTrackerRows(legacySnapshot.trackerRows, { section: "B" });
  const sectionBIncludesSubmitted = sectionBFilter.some((r) =>
    r.contributingPlanIds.includes("p-legacy"),
  );
  const sectionBExpectedRow = sectionBFilter.some(
    (r) => r.rowKind === "expected_slot" && r.expectedSections.includes("B"),
  );

  const snapshotH = buildDepartmentWeeklyPlanningSnapshot([abcdTeacher], [planAb, planCd]);
  const expectedSlotCount = snapshotH.trackerRows.filter((r) => r.rowKind === "expected_slot").length;
  const scopes = abcdTeacher.scopes.length;

  const slotNormalized =
    planSlotKey("t1", 2, "10", weeklyPlanSectionsKey(["C", "A", "B"]), "A") ===
    planSlotKey("t1", 2, "10", weeklyPlanSectionsKey(["A", "B", "C"]), "A");

  const scopeKeyMatches =
    expectedScopeKey("t1", week, "10", "B") === `${abcdTeacher.userId}|${week}|10|B`;

  const directStatusComplete = deriveExpectedSlotStatus([...expectedSections], [planFull]);
  const directStatusPartial = deriveExpectedSlotStatus([...expectedSections], [planAb]);

  const completionMatch =
    rowA &&
    calculateWeeklyPlanCompletion(planFull).completed === rowA.completion.completed;

  return [
    {
      name: "A: single plan [A,B,C,D] at 100% → Complete",
      pass: Boolean(rowA && rowA.status === "complete" && rowA.missingSections.length === 0),
      detail: rowA ? `${rowA.status}, missing=${rowA.missingSections.join()}` : "missing row",
    },
    {
      name: "B: split plans [A,B] + [C,D] both 100% → Complete",
      pass: Boolean(
        rowB &&
          rowB.status === "complete" &&
          rowB.contributingPlanIds.length === 2 &&
          rowB.missingSections.length === 0,
      ),
      detail: rowB
        ? `${rowB.status}, plans=${rowB.contributingPlanIds.length}`
        : "missing row",
    },
    {
      name: "C: partial [A,B] only → In Progress, missing C,D",
      pass: Boolean(
        rowC &&
          rowC.status === "in_progress" &&
          rowC.missingSections.includes("C") &&
          rowC.missingSections.includes("D"),
      ),
      detail: rowC ? `${rowC.status}, missing=${rowC.missingSections.join()}` : "missing row",
    },
    {
      name: "D: no plan → Not Started",
      pass: Boolean(rowD && rowD.status === "not_started" && !rowD.isSubmitted),
      detail: rowD?.status ?? "missing",
    },
    {
      name: "E: overlap [A,B,C] + [C,D] unions to A,B,C,D",
      pass:
        overlapUnion.join() === "A,B,C,D" &&
        Boolean(rowE && rowE.coveredSections.join() === "A,B,C,D" && rowE.status === "complete"),
      detail: `union=${overlapUnion.join()}, covered=${rowE?.coveredSections.join()}`,
    },
    {
      name: "F: all sections covered but incomplete plan → In Progress",
      pass: Boolean(
        rowF &&
          rowF.status === "in_progress" &&
          rowF.missingSections.length === 0 &&
          rowF.coveredSections.join() === "A,B,C,D",
      ),
      detail: rowF ? `${rowF.status}, pct=${Math.round(rowF.completion.percentage * 100)}%` : "missing",
    },
    {
      name: "G: section B filter includes expected and submitted rows",
      pass: sectionBIncludesSubmitted && sectionBExpectedRow,
      detail: `rows=${sectionBFilter.length}`,
    },
    {
      name: "H: expected slot count = scopes × 30 (not inflated by split plans)",
      pass: expectedSlotCount === scopes * 30 && snapshotH.metrics.totalWeeklyPlans === 2,
      detail: `slots=${expectedSlotCount}, plans=${snapshotH.metrics.totalWeeklyPlans}`,
    },
    {
      name: "Multi-section scope merges assignments",
      pass: scopes === 1 && abcdTeacher.scopes[0]?.sections_key === "A,B,C,D",
      detail: `scopes=${scopes}, key=${abcdTeacher.scopes[0]?.sections_key}`,
    },
    {
      name: "Expected scope key excludes sections_key",
      pass: scopeKeyMatches,
      detail: expectedScopeKey("t1", week, "10", "B"),
    },
    {
      name: "Sections key order normalized (legacy planSlotKey)",
      pass: slotNormalized,
      detail: "A,B,C equivalent",
    },
    {
      name: "Completion uses calculateWeeklyPlanCompletion engine",
      pass: Boolean(completionMatch),
      detail: rowA ? String(rowA.completion.completed) : "n/a",
    },
    {
      name: "deriveExpectedSlotStatus: full coverage + complete plans",
      pass: directStatusComplete.status === "complete",
      detail: directStatusComplete.status,
    },
    {
      name: "deriveExpectedSlotStatus: partial section coverage",
      pass:
        directStatusPartial.status === "in_progress" &&
        directStatusPartial.missingSections.includes("C"),
      detail: `missing=${directStatusPartial.missingSections.join()}`,
    },
  ];
}

export function allWeeklyPlanDashboardTestsPass(): boolean {
  return runWeeklyPlanDashboardTests().every((t) => t.pass);
}
