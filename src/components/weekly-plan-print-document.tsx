import type {
  WeeklyPlanDocumentModel,
  WeeklyPlanDocumentPeriod,
} from "@/lib/weekly-plan-document-model";
import { WEEKLY_PLAN_PDF_EXPORT_ID } from "@/lib/weekly-plan-document-model";

function CellValue({ value }: { value: string }) {
  return <div className="wp-v">{value}</div>;
}

function formatStudentList(names: string[]): string {
  if (names.length === 0) return "—";
  return names.map((name, i) => `${i + 1}. ${name}`).join("\n");
}

function DiffCell({
  studentNames,
  notes,
  studentsLabel,
  notesLabel,
}: {
  studentNames: string[];
  notes: string;
  studentsLabel: string;
  notesLabel: string;
}) {
  return (
    <td className="wp-diff-cell">
      <div className="wp-diff-sub">{studentsLabel}</div>
      <div className="wp-v wp-diff-names">{formatStudentList(studentNames)}</div>
      <div className="wp-diff-sub">{notesLabel}</div>
      <div className="wp-v">{notes}</div>
    </td>
  );
}

function PeriodYouDoRows({
  first,
  second,
  labels,
}: {
  first: WeeklyPlanDocumentPeriod;
  second: WeeklyPlanDocumentPeriod;
  labels: WeeklyPlanDocumentModel["labels"];
}) {
  const groups = [
    {
      label: labels.youDoDeveloping,
      first: first.youDoDeveloping,
      second: second.youDoDeveloping,
      cls: "wp-yd-dev",
    },
    {
      label: labels.youDoSecuring,
      first: first.youDoSecuring,
      second: second.youDoSecuring,
      cls: "wp-yd-sec",
    },
    {
      label: labels.youDoMastering,
      first: first.youDoMastering,
      second: second.youDoMastering,
      cls: "wp-yd-mas",
    },
    {
      label: labels.youDoExtension,
      first: first.youDoExtension,
      second: second.youDoExtension,
      cls: "wp-yd-ext",
    },
  ];

  return (
    <>
      <tr className="wp-row-activity">
        <th className="wp-th-act">
          {labels.youDo} — {first.youDoMinutes} min
        </th>
        <td className="wp-td-empty" colSpan={2} />
      </tr>
      {groups.map((g) => (
        <tr key={g.label} className={`wp-row-yd ${g.cls}`}>
          <th className="wp-th-yd">{g.label}</th>
          <td className="wp-td"><CellValue value={g.first} /></td>
          <td className="wp-td"><CellValue value={g.second} /></td>
        </tr>
      ))}
    </>
  );
}

function ActivityRow({
  label,
  firstValue,
  secondValue,
}: {
  label: string;
  firstValue: string;
  secondValue: string;
}) {
  return (
    <tr className="wp-row-activity">
      <th className="wp-th-act">{label}</th>
      <td className="wp-td"><CellValue value={firstValue} /></td>
      <td className="wp-td"><CellValue value={secondValue} /></td>
    </tr>
  );
}

export function WeeklyPlanPrintDocument({ model }: { model: WeeklyPlanDocumentModel }) {
  const { labels } = model;
  const fp = model.firstPeriod;
  const sp = model.secondPeriod;
  const studentsLabel = model.language === "ar" ? "الطلاب" : "Students";
  const notesLabel = model.language === "ar" ? "ملاحظات / تكييفات" : "Notes / accommodations";
  const fontFamily =
    model.language === "ar"
      ? '"Tajawal", "Segoe UI", sans-serif'
      : '"Inter", "Segoe UI", sans-serif';

  const p21Text = model.p21Skills.length > 0 ? model.p21Skills.join("\n") : "—";

  return (
    <div
      id={WEEKLY_PLAN_PDF_EXPORT_ID}
      dir={model.dir}
      lang={model.language}
      className="wp-root"
      style={{ fontFamily }}
    >
      <style>{`
        .wp-root {
          width: 297mm;
          min-height: 210mm;
          box-sizing: border-box;
          padding: 4mm 5mm;
          background: #fff;
          color: #1a1a1a;
          font-size: 8pt;
          line-height: 1.25;
        }
        .wp-root * { box-sizing: border-box; }
        .wp-sheet { width: 100%; border-collapse: collapse; margin: 0; }
        .wp-sheet + .wp-sheet { margin-top: 0; }
        .wp-sheet th, .wp-sheet td {
          border: 1px solid #2b2b2b;
          padding: 2px 4px;
          vertical-align: top;
          word-wrap: break-word;
          overflow-wrap: anywhere;
          white-space: normal;
        }
        .wp-v {
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: anywhere;
          font-size: 7.5pt;
          line-height: 1.3;
        }
        .wp-title-bar {
          background: #2b2b2b;
          color: #fff;
          border: 1px solid #2b2b2b;
        }
        .wp-title-bar td {
          border-color: #2b2b2b;
          padding: 3px 5px;
          vertical-align: middle;
        }
        .wp-title-bar img {
          max-height: 28px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .wp-title-text {
          font-size: 12pt;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
        }
        .wp-title-sub {
          font-size: 8pt;
          text-align: center;
          opacity: 0.9;
          margin-top: 1px;
        }
        .wp-th-meta {
          background: #3d3d3d;
          color: #fff;
          font-weight: 700;
          font-size: 7.5pt;
          width: 11%;
          white-space: nowrap;
        }
        .wp-td-meta {
          background: #fff;
          font-size: 7.5pt;
          width: 14%;
        }
        .wp-th-gold {
          background: #e8b923;
          color: #1a1a1a;
          font-weight: 700;
          font-size: 8pt;
          text-align: center;
        }
        .wp-td {
          background: #fff;
          font-size: 7.5pt;
        }
        .wp-td-empty {
          background: #fff;
          padding: 0;
          border: 1px solid #2b2b2b;
        }
        .wp-th-dark {
          background: #2b2b2b;
          color: #fff;
          font-weight: 700;
          font-size: 8.5pt;
          text-align: center;
          padding: 3px 4px;
        }
        .wp-th-act {
          background: #f5f5f5;
          color: #1a1a1a;
          font-weight: 700;
          font-size: 7.5pt;
          width: 22%;
          text-align: left;
        }
        .wp-th-yd {
          background: #fafafa;
          font-weight: 700;
          font-size: 7pt;
          width: 22%;
          text-align: left;
          padding: 2px 4px;
        }
        .wp-row-activity { break-inside: avoid; }
        .wp-row-yd { break-inside: avoid; }
        .wp-yd-dev .wp-th-yd, .wp-yd-dev .wp-td { background: #fff7ed; }
        .wp-yd-sec .wp-th-yd, .wp-yd-sec .wp-td { background: #fefce8; }
        .wp-yd-mas .wp-th-yd, .wp-yd-mas .wp-td { background: #f0fdf4; }
        .wp-yd-ext .wp-th-yd, .wp-yd-ext .wp-td { background: #eff6ff; }
        .wp-diff-section { break-inside: avoid-page; }
        .wp-diff-cell {
          width: 25%;
          padding: 2px 4px;
          vertical-align: top;
        }
        .wp-diff-sub {
          font-weight: 700;
          font-size: 7pt;
          color: #3d3d3d;
          margin-top: 2px;
        }
        .wp-diff-names { margin-bottom: 2px; }
        .wp-reflect-th {
          background: #3d3d3d;
          color: #fff;
          font-weight: 700;
          font-size: 8pt;
          width: 18%;
          vertical-align: top;
        }
        .wp-footer-th {
          background: #f5f5f5;
          font-weight: 700;
          font-size: 7pt;
          width: 10%;
          vertical-align: top;
        }
        .wp-footer-td {
          font-size: 7pt;
          line-height: 1.35;
        }
        .wp-period-block thead .wp-th-dark {
          background: #2b2b2b;
          color: #fff;
        }
        .wp-footer-block { break-inside: avoid; }
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          html, body {
            margin: 0;
            padding: 0;
          }
          #weekly-plan-pdf-export,
          #weekly-plan-pdf-export *,
          .wp-root,
          .wp-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #weekly-plan-pdf-export,
          .wp-root {
            width: 100%;
            min-height: 0;
            padding: 0;
            background: #fff;
          }
          table.wp-sheet {
            border-collapse: collapse;
            width: 100%;
            page-break-inside: auto;
          }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .wp-title-bar,
          .wp-title-bar td {
            background: #2b2b2b !important;
            color: #fff !important;
          }
          .wp-th-dark {
            background: #2b2b2b !important;
            color: #fff !important;
          }
          .wp-th-meta,
          .wp-reflect-th {
            background: #3d3d3d !important;
            color: #fff !important;
          }
          .wp-th-gold {
            background: #e8b923 !important;
            color: #1a1a1a !important;
          }
          .wp-yd-dev .wp-th-yd,
          .wp-yd-dev .wp-td {
            background: #fff7ed !important;
          }
          .wp-yd-sec .wp-th-yd,
          .wp-yd-sec .wp-td {
            background: #fefce8 !important;
          }
          .wp-yd-mas .wp-th-yd,
          .wp-yd-mas .wp-td {
            background: #f0fdf4 !important;
          }
          .wp-yd-ext .wp-th-yd,
          .wp-yd-ext .wp-td {
            background: #eff6ff !important;
          }
          .wp-title-bar img {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            max-height: 28px !important;
            max-width: 80px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }
          .wp-diff-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .wp-footer-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .wp-v {
            height: auto;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }
          .wp-sheet th,
          .wp-sheet td {
            height: auto;
            vertical-align: top;
          }
        }
      `}</style>

      {/* Title bar */}
      <table className="wp-sheet">
        <tbody>
          <tr className="wp-title-bar">
            <td style={{ width: "12%", textAlign: "center" }}>
              <img
                src={model.logos.islamic}
                alt=""
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </td>
            <td>
              <div className="wp-title-text">{model.title}</div>
              <div className="wp-title-sub">{model.departmentLine}</div>
            </td>
            <td style={{ width: "12%", textAlign: "center" }}>
              <img
                src={model.logos.school}
                alt=""
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Header metadata */}
      <table className="wp-sheet">
        <tbody>
          <tr>
            <th className="wp-th-meta">{labels.teacher}</th>
            <td className="wp-td-meta">{model.teacher}</td>
            <th className="wp-th-meta">{labels.phase}</th>
            <td className="wp-td-meta">{model.phase}</td>
            <th className="wp-th-meta">{labels.grade}</th>
            <td className="wp-td-meta">{model.grade}</td>
            <th className="wp-th-meta">{labels.section}</th>
            <td className="wp-td-meta">{model.section}</td>
          </tr>
          <tr>
            <th className="wp-th-meta">{labels.studentCount}</th>
            <td className="wp-td-meta">{model.studentCount}</td>
            <th className="wp-th-meta">{labels.islamicGroup}</th>
            <td className="wp-td-meta">{model.islamicGroup}</td>
            <th className="wp-th-meta">{labels.day}</th>
            <td className="wp-td-meta">{model.day}</td>
            <th className="wp-th-meta">{labels.date}</th>
            <td className="wp-td-meta">{model.date}</td>
          </tr>
          <tr>
            <th className="wp-th-meta">{labels.subject}</th>
            <td className="wp-td-meta">{model.subject}</td>
            <th className="wp-th-meta">{labels.domain}</th>
            <td className="wp-td-meta">{model.domain}</td>
            <th className="wp-th-meta">{labels.week}</th>
            <td className="wp-td-meta">{model.week}</td>
            <th className="wp-th-meta" />
            <td className="wp-td-meta" />
          </tr>
          <tr>
            <th className="wp-th-meta">{labels.successCriterion}</th>
            <td className="wp-td-meta" colSpan={3}>
              <CellValue value={model.successCriterion} />
            </td>
            <th className="wp-th-meta">{labels.learningOutcomes}</th>
            <td className="wp-td-meta" colSpan={3}>
              <CellValue value={model.learningOutcomes} />
            </td>
          </tr>
          <tr>
            <th className="wp-th-meta">{labels.unit}</th>
            <td className="wp-td-meta" colSpan={7}>
              <CellValue value={model.unit} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Lesson metadata — 3 columns */}
      <table className="wp-sheet">
        <tbody>
          <tr>
            <th className="wp-th-gold">{labels.lessonTitle}</th>
            <th className="wp-th-gold">{labels.uaeCulture}</th>
            <th className="wp-th-gold">{labels.crossCurricular}</th>
          </tr>
          <tr>
            <td className="wp-td"><CellValue value={model.lessonTitle} /></td>
            <td className="wp-td"><CellValue value={model.uaeCulture} /></td>
            <td className="wp-td"><CellValue value={model.crossCurricular} /></td>
          </tr>
          <tr>
            <th className="wp-th-gold">{labels.p21}</th>
            <th className="wp-th-gold">{labels.vocabulary}</th>
            <th className="wp-th-gold">{labels.resources}</th>
          </tr>
          <tr>
            <td className="wp-td"><CellValue value={p21Text} /></td>
            <td className="wp-td"><CellValue value={model.keyVocabulary} /></td>
            <td className="wp-td"><CellValue value={model.resources} /></td>
          </tr>
        </tbody>
      </table>

      {/* Differentiation — 4 horizontal columns */}
      <table className="wp-sheet wp-diff-section">
        <tbody>
          <tr>
            <th className="wp-th-dark" colSpan={4}>{labels.differentiation}</th>
          </tr>
          <tr>
            {model.differentiation.map((cat) => (
              <th key={cat.key} className="wp-th-gold">{cat.label}</th>
            ))}
          </tr>
          <tr>
            {model.differentiation.map((cat) => (
              <DiffCell
                key={cat.key}
                studentNames={cat.studentNames}
                notes={cat.notes}
                studentsLabel={studentsLabel}
                notesLabel={notesLabel}
              />
            ))}
          </tr>
        </tbody>
      </table>

      {/* Process of Learning — thead repeats on continuation pages when printing */}
      <table className="wp-sheet wp-period-block">
        <thead>
          <tr>
            <th className="wp-th-dark" colSpan={3}>{labels.processOfLearning}</th>
          </tr>
          <tr>
            <th className="wp-th-dark" style={{ width: "22%" }} />
            <th className="wp-th-dark">{labels.firstPeriod}</th>
            <th className="wp-th-dark">{labels.secondPeriod}</th>
          </tr>
        </thead>
        <tbody>
          <ActivityRow
            label={`${labels.doNow} — ${fp.doNowMinutes} min`}
            firstValue={fp.doNow}
            secondValue={sp.doNow}
          />
          <ActivityRow
            label={`${labels.objective} — ${fp.learningObjectiveMinutes} min`}
            firstValue={fp.learningObjectiveSuccessCriteria}
            secondValue={sp.learningObjectiveSuccessCriteria}
          />
          <ActivityRow
            label={`${labels.iDo} — ${fp.iDoMinutes} min`}
            firstValue={fp.iDo}
            secondValue={sp.iDo}
          />
          <ActivityRow
            label={`${labels.weDo} — ${fp.weDoMinutes} min`}
            firstValue={fp.weDo}
            secondValue={sp.weDo}
          />
          <ActivityRow
            label={`${labels.mid} — ${fp.midAssessmentMinutes} min`}
            firstValue={fp.midAssessment}
            secondValue={sp.midAssessment}
          />
          <PeriodYouDoRows first={fp} second={sp} labels={labels} />
          <ActivityRow
            label={`${labels.exitTicket} — ${fp.exitTicketMinutes} min`}
            firstValue={fp.exitTicket}
            secondValue={sp.exitTicket}
          />
          <ActivityRow label={labels.sir} firstValue={fp.sirMethod} secondValue={sp.sirMethod} />
          <ActivityRow label={labels.homework} firstValue={fp.homework} secondValue={sp.homework} />
        </tbody>
      </table>

      {/* Reflection */}
      <table className="wp-sheet">
        <tbody>
          <tr>
            <th className="wp-reflect-th">{labels.reflection}</th>
            <td className="wp-td">
              <CellValue value={model.reflection} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Mission / Vision footer */}
      <table className="wp-sheet wp-footer-block">
        <tbody>
          <tr>
            <th className="wp-footer-th">{labels.mission}</th>
            <td className="wp-footer-td">{model.mission}</td>
          </tr>
          <tr>
            <th className="wp-footer-th">{labels.vision}</th>
            <td className="wp-footer-td">{model.vision}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Legacy wrapper when only WeeklyPlanRow is available — caller should prefer document model. */
export function WeeklyPlanPrintDocumentFromPlan({
  model,
}: {
  model: WeeklyPlanDocumentModel;
}) {
  return <WeeklyPlanPrintDocument model={model} />;
}
