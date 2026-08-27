/**
 * Regression tests for Weekly Plan PDF capture (single DOM, row-boundary slices).
 */

import type { WeeklyPlanRow } from "@/lib/weekly-planning";
import { buildWeeklyPlanDocumentModel } from "@/lib/weekly-plan-document-model";
import {
  computeRowAwarePageSlices,
  constrainWeeklyPlanCaptureImages,
  prepareWeeklyPlanCloneForCapture,
  validatePageSlicesNoGaps,
  WEEKLY_PLAN_PAGE_HEIGHT_PX,
  WEEKLY_PLAN_PDF_WIDTH_PX,
  WEEKLY_PLAN_USABLE_PAGE_HEIGHT_PX,
  type PdfRowSegment,
} from "@/lib/weekly-plan-pdf";

export type WeeklyPlanPdfTestResult = { name: string; pass: boolean; detail: string };

function longArabicPlan(): WeeklyPlanRow {
  const paragraph = "نص عربي طويل يصف النشاط والتعلم والتقييم والمتابعة. ";
  const long = paragraph.repeat(40);
  return {
    id: "plan-long",
    teacher_id: "teacher-1",
    plan_language: "ar",
    week_number: 3,
    academic_year: "2026-2027",
    phase: "المرحلة الثانوية / High",
    grade: "10",
    section: "A",
    sections: ["A"],
    islamic_group: "B",
    student_count: 28,
    day: "الاثنين / Monday",
    plan_date: "2026-09-15",
    subject: "التربية الإسلامية / Islamic Education",
    domain: "العقيدة الإسلامية / Islamic Creed",
    success_criterion: long,
    learning_outcomes: long,
    unit: "الوحدة الثالثة / Unit 3",
    lesson_title: "درس التوحيد — توسيع",
    uae_culture: long.slice(0, 200),
    cross_curricular_real_life: long.slice(0, 200),
    p21_skills: ["التفكير الناقد / Critical Thinking", "الإبداع / Creativity"],
    key_vocabulary: "إيمان، توحيد، عبادة، شكر، صبر",
    resources: "Schoology، الكتاب المدرسي، منصات رقمية",
    differentiation_sod: {
      student_ids: ["s1", "s2", "s3"],
      student_names_snapshot: ["أحمد علي", "سارة محمد", "عمر حسن"],
      notes: long.slice(0, 300),
    },
    differentiation_eal: {
      student_ids: ["s4"],
      student_names_snapshot: ["John Smith"],
      notes: long.slice(0, 200),
    },
    differentiation_gt: {
      student_ids: ["s5"],
      student_names_snapshot: ["فاطمة حسن"],
      notes: long.slice(0, 200),
    },
    differentiation_emirati: {
      student_ids: ["s6", "s7"],
      student_names_snapshot: ["خالد إماراتي", "مريم إماراتي"],
      notes: long.slice(0, 200),
    },
    first_period: {
      do_now: long.slice(0, 150),
      learning_objective_success_criteria: long.slice(0, 150),
      i_do: long.slice(0, 150),
      we_do: long.slice(0, 150),
      mid_assessment: long.slice(0, 150),
      you_do: {
        developing: long.slice(0, 120),
        securing: long.slice(0, 120),
        mastering: long.slice(0, 120),
        extension: long.slice(0, 120),
      },
      exit_ticket: long.slice(0, 100),
      sir_method: "ذاتي / Self",
      homework: long.slice(0, 100),
    },
    second_period: {
      do_now: long.slice(0, 150),
      learning_objective_success_criteria: long.slice(0, 150),
      i_do: long.slice(0, 150),
      we_do: long.slice(0, 150),
      mid_assessment: long.slice(0, 150),
      you_do: {
        developing: long.slice(0, 120),
        securing: long.slice(0, 120),
        mastering: long.slice(0, 120),
        extension: long.slice(0, 120),
      },
      exit_ticket: long.slice(0, 100),
      sir_method: "المعلم / Teacher",
      homework: long.slice(0, 100),
    },
    teacher_reflection: long.slice(0, 400),
    status: "complete",
    completion_percentage: 1,
    created_at: "",
    updated_at: "",
  };
}

function mockProcessRows(count: number, rowHeight: number, startTop = 0): PdfRowSegment[] {
  const rows: PdfRowSegment[] = [];
  for (let i = 0; i < count; i++) {
    const top = startTop + i * rowHeight;
    rows.push({ top, bottom: top + rowHeight, height: rowHeight });
  }
  return rows;
}

export function runWeeklyPlanPdfPaginationTests(): WeeklyPlanPdfTestResult[] {
  const usable = 100;

  const rowsA: PdfRowSegment[] = [
    { top: 0, bottom: 90, height: 90 },
    { top: 90, bottom: 100, height: 10 },
  ];
  const slicesA = computeRowAwarePageSlices(100, rowsA, { usablePageHeight: usable });

  const rowsB: PdfRowSegment[] = [
    { top: 0, bottom: 99, height: 99 },
    { top: 99, bottom: 150, height: 51 },
  ];
  const slicesB = computeRowAwarePageSlices(150, rowsB, { usablePageHeight: usable });

  const prefix: PdfRowSegment[] = [
    { top: 0, bottom: 50, height: 50 },
    { top: 50, bottom: 100, height: 50 },
    { top: 100, bottom: 150, height: 50 },
    { top: 150, bottom: 200, height: 50 },
  ];
  const processRows = mockProcessRows(20, 40, 200);
  const rowsC = [...prefix, ...processRows, { top: 1000, bottom: 1060, height: 60 }];
  const slicesC = computeRowAwarePageSlices(1060, rowsC, { usablePageHeight: usable });

  const rowsD: PdfRowSegment[] = [{ top: 0, bottom: 250, height: 250 }];
  const slicesD = computeRowAwarePageSlices(250, rowsD, { usablePageHeight: usable });

  return [
    {
      name: "A: rows fitting page bottom stay on same page",
      pass: slicesA.length === 1 && slicesA[0].end === 100,
      detail: JSON.stringify(slicesA),
    },
    {
      name: "B: row exceeding remaining space moves to next page intact",
      pass:
        slicesB.length === 2 &&
        slicesB[0].end === 99 &&
        slicesB[1].start === 99 &&
        slicesB[1].end === 150,
      detail: JSON.stringify(slicesB),
    },
    {
      name: "C: long process rows span 3+ pages without gaps",
      pass: slicesC.length >= 3 && validatePageSlicesNoGaps(1060, slicesC),
      detail: `pages=${slicesC.length}`,
    },
    {
      name: "D: oversized row splits only as fallback",
      pass: slicesD.length >= 2,
      detail: `pages=${slicesD.length}`,
    },
    {
      name: "E: no gaps or overlaps in slice ranges",
      pass: validatePageSlicesNoGaps(1060, slicesC),
      detail: `count=${slicesC.length}`,
    },
    {
      name: "Usable height includes safety margins",
      pass: WEEKLY_PLAN_USABLE_PAGE_HEIGHT_PX < WEEKLY_PLAN_PAGE_HEIGHT_PX,
      detail: `usable=${WEEKLY_PLAN_USABLE_PAGE_HEIGHT_PX}`,
    },
  ];
}

export function runWeeklyPlanPdfCaptureTests(): WeeklyPlanPdfTestResult[] {
  const pagination = runWeeklyPlanPdfPaginationTests();

  if (typeof document === "undefined") {
    return pagination;
  }

  const model = buildWeeklyPlanDocumentModel(longArabicPlan(), {
    teacherDisplayName: "Ahmed Al Awadhi",
  });

  const container = document.createElement("div");
  container.style.width = `${WEEKLY_PLAN_PDF_WIDTH_PX}px`;
  container.style.position = "absolute";
  container.style.left = "0";
  container.style.top = "0";
  container.style.visibility = "hidden";

  const source = document.createElement("div");
  source.id = "weekly-plan-pdf-export";
  source.className = "wp-root";
  source.innerHTML = `
    <style>
      .wp-title-bar img { max-height: 28px; width: auto; object-fit: contain; display: block; }
      .wp-root { width: 297mm; padding: 4mm 5mm; }
    </style>
    <table class="wp-sheet"><tr class="wp-title-bar">
      <td><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="2000" height="2000" /></td>
      <td>Title</td>
    </tr></table>
  `;

  document.body.appendChild(container);
  container.appendChild(source);

  const clone = prepareWeeklyPlanCloneForCapture(source);
  container.appendChild(clone);
  const goodImgHeight = (clone.querySelector("img") as HTMLImageElement).offsetHeight;

  document.body.removeChild(container);

  return [
    ...pagination,
    {
      name: "Prepared clone constrains logo height",
      pass: goodImgHeight <= 40,
      detail: `img height=${goodImgHeight}`,
    },
    {
      name: "Capture width matches printable width",
      pass: clone.scrollWidth <= WEEKLY_PLAN_PDF_WIDTH_PX + 4,
      detail: `scrollWidth=${clone.scrollWidth}`,
    },
    {
      name: "Long Arabic model builds for PDF",
      pass: model.language === "ar" && model.dir === "rtl",
      detail: `lang=${model.language}`,
    },
  ];
}

export function allWeeklyPlanPdfCaptureTestsPass(): boolean {
  return runWeeklyPlanPdfCaptureTests().every((t) => t.pass);
}

export function runWeeklyPlanImageConstraintTest(): WeeklyPlanPdfTestResult {
  if (typeof document === "undefined") {
    return {
      name: "constrainWeeklyPlanCaptureImages sets inline limits",
      pass: true,
      detail: "skipped (no DOM)",
    };
  }

  const wrap = document.createElement("div");
  const img = document.createElement("img");
  img.width = 3000;
  img.height = 3000;
  wrap.appendChild(img);
  constrainWeeklyPlanCaptureImages(wrap);
  const pass = img.style.maxHeight === `${28}px` && img.style.maxWidth === `${80}px`;
  return {
    name: "constrainWeeklyPlanCaptureImages sets inline limits",
    pass,
    detail: `maxHeight=${img.style.maxHeight}, maxWidth=${img.style.maxWidth}`,
  };
}
