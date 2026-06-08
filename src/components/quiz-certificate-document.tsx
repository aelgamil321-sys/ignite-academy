import { forwardRef } from "react";
import type { QuizCertificateDisplayData } from "@/lib/quiz-certificate";

/** Landscape A4 at ~96dpi for html2canvas capture */
export const CERTIFICATE_WIDTH_PX = 1123;
export const CERTIFICATE_HEIGHT_PX = 794;

function LogoIgnite() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r="34" fill="#0f5c4a" />
      <circle cx="36" cy="36" r="28" fill="none" stroke="#d4af37" strokeWidth="2" />
      <path
        d="M36 14 L52 52 H20 Z"
        fill="none"
        stroke="#f8f5ee"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text
        x="36"
        y="64"
        textAnchor="middle"
        fill="#d4af37"
        fontSize="7"
        fontFamily="Georgia, serif"
      >
        IGNITE
      </text>
    </svg>
  );
}

function LogoDeptPlaceholder() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <rect x="4" y="4" width="64" height="64" rx="8" fill="#f8f5ee" stroke="#d4af37" strokeWidth="2" />
      <circle cx="36" cy="30" r="14" fill="none" stroke="#0f5c4a" strokeWidth="2" />
      <path d="M22 52 Q36 42 50 52" fill="none" stroke="#0f5c4a" strokeWidth="2" />
      <text x="36" y="66" textAnchor="middle" fill="#0f5c4a" fontSize="5" fontFamily="Arial">
        DEPT
      </text>
    </svg>
  );
}

export const QuizCertificateDocument = forwardRef<
  HTMLDivElement,
  { data: QuizCertificateDisplayData }
>(function QuizCertificateDocument({ data }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: CERTIFICATE_WIDTH_PX,
        height: CERTIFICATE_HEIGHT_PX,
        background: "linear-gradient(135deg, #fffef8 0%, #f5faf7 50%, #fffef8 100%)",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#1a3d34",
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Outer gold frame */}
      <div
        style={{
          position: "absolute",
          inset: 12,
          border: "3px solid #d4af37",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 20,
          border: "1px solid #0f5c4a",
          pointerEvents: "none",
        }}
      />

      {/* Corner ornaments */}
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
            borderTop: "top" in pos && pos.top ? "2px solid #d4af37" : undefined,
            borderBottom: "bottom" in pos ? "2px solid #d4af37" : undefined,
            borderLeft: "left" in pos && pos.left !== undefined ? "2px solid #d4af37" : undefined,
            borderRight: "right" in pos ? "2px solid #d4af37" : undefined,
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
        }}
      >
        {/* Header logos */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <LogoIgnite />
            <div style={{ fontSize: 10, color: "#0f5c4a", marginTop: 4, fontWeight: 600 }}>
              Ignite School
            </div>
          </div>
          <div style={{ textAlign: "center", flex: 1, padding: "0 24px" }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                color: "#d4af37",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              ✦ ✦ ✦
            </div>
            <div style={{ fontSize: 13, color: "#0f5c4a", fontWeight: 700 }}>
              قسم التربية الإسلامية
            </div>
            <div style={{ fontSize: 11, color: "#5a7a72", fontStyle: "italic" }}>
              Islamic Education Department
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <LogoDeptPlaceholder />
            <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>Logo Placeholder</div>
          </div>
        </div>

        {/* Academy name */}
        <div style={{ textAlign: "center", marginTop: 20, marginBottom: 8 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0f5c4a", letterSpacing: 1 }}>
            Ignite Islamic Academy
          </div>
          <div style={{ fontSize: 22, color: "#1a5c4a", marginTop: 4, direction: "rtl" }}>
            أكاديمية إغنايت الإسلامية
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <div
            style={{
              display: "inline-block",
              borderTop: "1px solid #d4af37",
              borderBottom: "1px solid #d4af37",
              padding: "8px 40px",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f5c4a" }}>
              Certificate of Completion
            </div>
            <div style={{ fontSize: 18, color: "#0f5c4a", marginTop: 4, direction: "rtl" }}>
              شهادة إتمام
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 13, color: "#4a6b63", marginBottom: 12 }}>
          This certifies that / نشهد بأن
        </div>

        {/* Student name */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#0f5c4a",
              borderBottom: "2px solid #d4af37",
              display: "inline-block",
              padding: "4px 32px 8px",
              minWidth: 280,
            }}
          >
            {data.studentName}
          </div>
        </div>

        {/* Details grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 48px",
            maxWidth: 720,
            margin: "0 auto",
            fontSize: 14,
            flex: 1,
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

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid #d4af3744",
            fontSize: 11,
            color: "#5a7a72",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "#0f5c4a" }}>Certificate ID</div>
            <div style={{ fontFamily: "monospace", fontSize: 12 }}>{data.certificateId}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 120, borderBottom: "1px solid #0f5c4a", marginBottom: 4 }} />
            <div>Authorized Signature / التوقيع</div>
          </div>
          <div style={{ textAlign: "right", direction: "rtl" }}>
            <div style={{ fontWeight: 600, color: "#0f5c4a" }}>رقم الشهادة</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, direction: "ltr" }}>
              {data.certificateId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function DetailRow({ en, ar, value }: { en: string; ar: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 11, color: "#888" }}>
        {en} / <span dir="rtl">{ar}</span>
      </div>
      <div style={{ fontWeight: 600, color: "#1a3d34", fontSize: 15 }}>{value}</div>
    </div>
  );
}
