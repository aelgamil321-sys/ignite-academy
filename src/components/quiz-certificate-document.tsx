import { forwardRef, type CSSProperties } from "react";
import type { QuizCertificateDisplayData } from "@/lib/quiz-certificate";

/** Landscape A4 at ~96dpi for html2canvas capture */
export const CERTIFICATE_WIDTH_PX = 1123;
export const CERTIFICATE_HEIGHT_PX = 794;

/** Plain HEX only — html2canvas cannot parse lab()/oklch()/theme variables */
export const CERT_COLORS = {
  darkGreen: "#0F3D2E",
  green: "#1F7A4D",
  gold: "#C9A227",
  cream: "#FFFDF5",
  white: "#FFFFFF",
  gray: "#4B5563",
  goldLight: "#E5D4A1",
} as const;

function LogoIgnite() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r="34" fill={CERT_COLORS.darkGreen} />
      <circle cx="36" cy="36" r="28" fill="none" stroke={CERT_COLORS.gold} strokeWidth="2" />
      <path
        d="M36 14 L52 52 H20 Z"
        fill="none"
        stroke={CERT_COLORS.cream}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text
        x="36"
        y="64"
        textAnchor="middle"
        fill={CERT_COLORS.gold}
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
      <rect
        x="4"
        y="4"
        width="64"
        height="64"
        rx="8"
        fill={CERT_COLORS.cream}
        stroke={CERT_COLORS.gold}
        strokeWidth="2"
      />
      <circle cx="36" cy="30" r="14" fill="none" stroke={CERT_COLORS.green} strokeWidth="2" />
      <path d="M22 52 Q36 42 50 52" fill="none" stroke={CERT_COLORS.green} strokeWidth="2" />
      <text
        x="36"
        y="66"
        textAnchor="middle"
        fill={CERT_COLORS.darkGreen}
        fontSize="5"
        fontFamily="Arial, sans-serif"
      >
        DEPT
      </text>
    </svg>
  );
}

const rootStyle: CSSProperties = {
  width: CERTIFICATE_WIDTH_PX,
  height: CERTIFICATE_HEIGHT_PX,
  backgroundColor: CERT_COLORS.cream,
  backgroundImage: `linear-gradient(135deg, ${CERT_COLORS.cream} 0%, ${CERT_COLORS.white} 50%, ${CERT_COLORS.cream} 100%)`,
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: CERT_COLORS.darkGreen,
  position: "relative",
  boxSizing: "border-box",
  overflow: "hidden",
  margin: 0,
  padding: 0,
  border: "none",
  WebkitFontSmoothing: "antialiased",
};

export const QuizCertificateDocument = forwardRef<
  HTMLDivElement,
  { data: QuizCertificateDisplayData }
>(function QuizCertificateDocument({ data }, ref) {
  return (
    <div ref={ref} data-certificate-root style={rootStyle}>
      <div
        style={{
          position: "absolute",
          inset: 12,
          border: `3px solid ${CERT_COLORS.gold}`,
          borderRadius: 4,
          pointerEvents: "none",
          backgroundColor: "transparent",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 20,
          border: `1px solid ${CERT_COLORS.green}`,
          pointerEvents: "none",
          backgroundColor: "transparent",
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
            borderTop: "top" in pos && pos.top ? `2px solid ${CERT_COLORS.gold}` : undefined,
            borderBottom: "bottom" in pos ? `2px solid ${CERT_COLORS.gold}` : undefined,
            borderLeft:
              "left" in pos && pos.left !== undefined ? `2px solid ${CERT_COLORS.gold}` : undefined,
            borderRight: "right" in pos ? `2px solid ${CERT_COLORS.gold}` : undefined,
            backgroundColor: "transparent",
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
          color: CERT_COLORS.darkGreen,
          backgroundColor: "transparent",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ textAlign: "center", color: CERT_COLORS.darkGreen }}>
            <LogoIgnite />
            <div style={{ fontSize: 10, color: CERT_COLORS.green, marginTop: 4, fontWeight: 600 }}>
              Ignite School
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              flex: 1,
              padding: "0 24px",
              color: CERT_COLORS.darkGreen,
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                color: CERT_COLORS.gold,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              ✦ ✦ ✦
            </div>
            <div style={{ fontSize: 13, color: CERT_COLORS.darkGreen, fontWeight: 700 }}>
              قسم التربية الإسلامية
            </div>
            <div style={{ fontSize: 11, color: CERT_COLORS.gray, fontStyle: "italic" }}>
              Islamic Education Department
            </div>
          </div>
          <div style={{ textAlign: "center", color: CERT_COLORS.gray }}>
            <LogoDeptPlaceholder />
            <div style={{ fontSize: 9, color: CERT_COLORS.gray, marginTop: 4 }}>
              Logo Placeholder
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, marginBottom: 8 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: CERT_COLORS.darkGreen,
              letterSpacing: 1,
            }}
          >
            Ignite Islamic Academy
          </div>
          <div style={{ fontSize: 22, color: CERT_COLORS.green, marginTop: 4, direction: "rtl" }}>
            أكاديمية إغنايت الإسلامية
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <div
            style={{
              display: "inline-block",
              borderTop: `1px solid ${CERT_COLORS.gold}`,
              borderBottom: `1px solid ${CERT_COLORS.gold}`,
              padding: "8px 40px",
              backgroundColor: "transparent",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: CERT_COLORS.darkGreen }}>
              Certificate of Completion
            </div>
            <div style={{ fontSize: 18, color: CERT_COLORS.darkGreen, marginTop: 4, direction: "rtl" }}>
              شهادة إتمام
            </div>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: CERT_COLORS.gray,
            marginBottom: 12,
          }}
        >
          This certifies that / نشهد بأن
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: CERT_COLORS.darkGreen,
              borderBottom: `2px solid ${CERT_COLORS.gold}`,
              display: "inline-block",
              padding: "4px 32px 8px",
              minWidth: 280,
              backgroundColor: "transparent",
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
            color: CERT_COLORS.darkGreen,
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
            borderTop: `1px solid ${CERT_COLORS.goldLight}`,
            fontSize: 11,
            color: CERT_COLORS.gray,
            backgroundColor: "transparent",
          }}
        >
          <div style={{ color: CERT_COLORS.gray }}>
            <div style={{ fontWeight: 600, color: CERT_COLORS.darkGreen }}>Certificate ID</div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: CERT_COLORS.darkGreen,
              }}
            >
              {data.certificateId}
            </div>
          </div>
          <div style={{ textAlign: "center", color: CERT_COLORS.gray }}>
            <div
              style={{
                width: 120,
                borderBottom: `1px solid ${CERT_COLORS.darkGreen}`,
                marginBottom: 4,
              }}
            />
            <div>Authorized Signature / التوقيع</div>
          </div>
          <div style={{ textAlign: "right", direction: "rtl", color: CERT_COLORS.gray }}>
            <div style={{ fontWeight: 600, color: CERT_COLORS.darkGreen }}>رقم الشهادة</div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                direction: "ltr",
                color: CERT_COLORS.darkGreen,
              }}
            >
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
    <div style={{ display: "flex", flexDirection: "column", gap: 2, color: CERT_COLORS.darkGreen }}>
      <div style={{ fontSize: 11, color: CERT_COLORS.gray }}>
        {en} / <span dir="rtl">{ar}</span>
      </div>
      <div style={{ fontWeight: 600, color: CERT_COLORS.darkGreen, fontSize: 15 }}>{value}</div>
    </div>
  );
}
