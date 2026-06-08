import { forwardRef, type CSSProperties } from "react";
import type { QuizCertificateDisplayData } from "@/lib/quiz-certificate";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
} from "@/components/quiz-certificate-document";

/** Element id passed to html2canvas — must not use className or theme CSS */
export const CERTIFICATE_EXPORT_ID = "certificate-export";

const C = {
  darkGreen: "#0F3D2E",
  green: "#1F7A4D",
  gold: "#C9A227",
  cream: "#FFFDF5",
  white: "#FFFFFF",
  gray: "#4B5563",
} as const;

const exportRootStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  top: 0,
  width: CERTIFICATE_WIDTH_PX,
  height: CERTIFICATE_HEIGHT_PX,
  zIndex: -1,
  overflow: "hidden",
  pointerEvents: "none",
  transform: "translateX(-300vw)",
  opacity: 1,
  visibility: "visible",
  margin: 0,
  padding: 0,
  border: "none",
  boxSizing: "border-box",
  backgroundColor: C.cream,
  backgroundImage: `linear-gradient(135deg, ${C.cream} 0%, ${C.white} 50%, ${C.cream} 100%)`,
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: C.darkGreen,
  lineHeight: "normal",
};

const pageStyle: CSSProperties = {
  width: CERTIFICATE_WIDTH_PX,
  height: CERTIFICATE_HEIGHT_PX,
  backgroundColor: C.cream,
  backgroundImage: `linear-gradient(135deg, ${C.cream} 0%, ${C.white} 50%, ${C.cream} 100%)`,
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: C.darkGreen,
  position: "relative",
  boxSizing: "border-box",
  overflow: "hidden",
  margin: 0,
  padding: 0,
  border: "none",
};

function LogoIgnite() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden={true}>
      <circle cx="36" cy="36" r="34" fill="#0F3D2E" />
      <circle cx="36" cy="36" r="28" fill="none" stroke="#C9A227" strokeWidth="2" />
      <path
        d="M36 14 L52 52 H20 Z"
        fill="none"
        stroke="#FFFDF5"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text x="36" y="64" textAnchor="middle" fill="#C9A227" fontSize="7" fontFamily="Georgia, serif">
        IGNITE
      </text>
    </svg>
  );
}

function LogoDeptPlaceholder() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden={true}>
      <rect x="4" y="4" width="64" height="64" rx="8" fill="#FFFDF5" stroke="#C9A227" strokeWidth="2" />
      <circle cx="36" cy="30" r="14" fill="none" stroke="#1F7A4D" strokeWidth="2" />
      <path d="M22 52 Q36 42 50 52" fill="none" stroke="#1F7A4D" strokeWidth="2" />
      <text x="36" y="66" textAnchor="middle" fill="#0F3D2E" fontSize="5" fontFamily="Arial, sans-serif">
        DEPT
      </text>
    </svg>
  );
}

function DetailRow({ en, ar, value }: { en: string; ar: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "#0F3D2E" }}>
      <div style={{ fontSize: 11, color: "#4B5563" }}>
        {en} / <span dir="rtl">{ar}</span>
      </div>
      <div style={{ fontWeight: 600, color: "#0F3D2E", fontSize: 15 }}>{value}</div>
    </div>
  );
}

/**
 * PDF-only certificate tree: inline HEX styles, no className, no CSS variables.
 * Portaled to document.body; html2canvas captures #certificate-export only.
 */
export const QuizCertificateExport = forwardRef<
  HTMLDivElement,
  { data: QuizCertificateDisplayData }
>(function QuizCertificateExport({ data }, ref) {
  return (
    <div id={CERTIFICATE_EXPORT_ID} ref={ref} aria-hidden={true} style={exportRootStyle}>
      <div style={pageStyle}>
        <div
          style={{
            position: "absolute",
            inset: 12,
            border: "3px solid #C9A227",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 20,
            border: "1px solid #1F7A4D",
            pointerEvents: "none",
          }}
        />

        {[
          { top: 28, left: 28 },
          { top: 28, right: 28 },
          { bottom: 28, left: 28 },
          { bottom: 28, right: 28 },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              ...pos,
              width: 24,
              height: 24,
              borderTop: "top" in pos && pos.top ? "2px solid #C9A227" : undefined,
              borderBottom: "bottom" in pos ? "2px solid #C9A227" : undefined,
              borderLeft: "left" in pos && pos.left !== undefined ? "2px solid #C9A227" : undefined,
              borderRight: "right" in pos ? "2px solid #C9A227" : undefined,
            }}
          />
        ))}

        <div
          style={{
            padding: "36px 56px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            color: "#0F3D2E",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ textAlign: "center", color: "#0F3D2E" }}>
              <LogoIgnite />
              <div style={{ fontSize: 10, color: "#1F7A4D", marginTop: 4, fontWeight: 600 }}>
                Ignite School
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1, padding: "0 24px", color: "#0F3D2E" }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 3,
                  color: "#C9A227",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                ✦ ✦ ✦
              </div>
              <div style={{ fontSize: 13, color: "#0F3D2E", fontWeight: 700 }}>
                قسم التربية الإسلامية
              </div>
              <div style={{ fontSize: 11, color: "#4B5563", fontStyle: "italic" }}>
                Islamic Education Department
              </div>
            </div>
            <div style={{ textAlign: "center", color: "#4B5563" }}>
              <LogoDeptPlaceholder />
              <div style={{ fontSize: 9, color: "#4B5563", marginTop: 4 }}>Logo Placeholder</div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 20, marginBottom: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0F3D2E", letterSpacing: 1 }}>
              Ignite Islamic Academy
            </div>
            <div style={{ fontSize: 22, color: "#1F7A4D", marginTop: 4, direction: "rtl" }}>
              أكاديمية إغنايت الإسلامية
            </div>
          </div>

          <div style={{ textAlign: "center", margin: "16px 0" }}>
            <div
              style={{
                display: "inline-block",
                borderTop: "1px solid #C9A227",
                borderBottom: "1px solid #C9A227",
                padding: "8px 40px",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0F3D2E" }}>
                Certificate of Completion
              </div>
              <div style={{ fontSize: 18, color: "#0F3D2E", marginTop: 4, direction: "rtl" }}>
                شهادة إتمام
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: 13, color: "#4B5563", marginBottom: 12 }}>
            This certifies that / نشهد بأن
          </div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#0F3D2E",
                borderBottom: "2px solid #C9A227",
                display: "inline-block",
                padding: "4px 32px 8px",
                minWidth: 280,
              }}
            >
              {data.studentName}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px 48px",
              maxWidth: 720,
              margin: "0 auto",
              fontSize: 14,
              flex: 1,
              color: "#0F3D2E",
            }}
          >
            <DetailRow en="Grade" ar="الصف" value={`${data.gradeName.en} / ${data.gradeName.ar}`} />
            <DetailRow
              en="Lesson"
              ar="الدرس"
              value={`${data.lessonTitle.en || "—"} / ${data.lessonTitle.ar || "—"}`}
            />
            <DetailRow
              en="Final Score"
              ar="الدرجة النهائية"
              value={`${data.finalScore} / ${data.totalPoints}`}
            />
            <DetailRow en="Percentage" ar="النسبة المئوية" value={`${data.percentage}%`} />
            <DetailRow
              en="Grade Label"
              ar="التقدير"
              value={`${data.gradeLabelEn} / ${data.gradeLabelAr}`}
            />
            <DetailRow en="Completion Date" ar="تاريخ الإتمام" value={data.completionDate} />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "auto",
              paddingTop: 16,
              borderTop: "1px solid #C9A227",
              fontSize: 11,
              color: "#4B5563",
            }}
          >
            <div style={{ color: "#4B5563" }}>
              <div style={{ fontWeight: 600, color: "#0F3D2E" }}>Certificate ID</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "#0F3D2E" }}>
                {data.certificateId}
              </div>
            </div>
            <div style={{ textAlign: "center", color: "#4B5563" }}>
              <div
                style={{
                  width: 120,
                  borderBottom: "1px solid #0F3D2E",
                  marginBottom: 4,
                }}
              />
              <div>Authorized Signature / التوقيع</div>
            </div>
            <div style={{ textAlign: "right", direction: "rtl", color: "#4B5563" }}>
              <div style={{ fontWeight: 600, color: "#0F3D2E" }}>رقم الشهادة</div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  direction: "ltr",
                  color: "#0F3D2E",
                }}
              >
                {data.certificateId}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
