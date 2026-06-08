import type { CSSProperties } from "react";
import type { QuizCertificateDisplayData } from "@/lib/quiz-certificate";
import {
  CERTIFICATE_SIGNATURE,
  certificateLogoUrl,
} from "@/lib/certificate-branding";

/** Landscape A4 at ~96dpi for html2canvas capture */
export const CERTIFICATE_WIDTH_PX = 1123;
export const CERTIFICATE_HEIGHT_PX = 794;

/** Plain HEX only — html2canvas cannot parse lab()/oklch()/theme variables */
export const CERT_COLORS = {
  navy: "#071A3D",
  darkGreen: "#0F3D2E",
  gold: "#C9A227",
  goldPale: "#F3E4A4",
  white: "#FFFFFF",
  cream: "#FFFDF5",
  beige: "#F7EEDC",
  beigePattern: "#EFE4CC",
  gray: "#6B7280",
} as const;

const PATTERN_BG: CSSProperties = {
  backgroundColor: CERT_COLORS.cream,
  backgroundImage: [
    `repeating-linear-gradient(45deg, ${CERT_COLORS.cream} 0px, ${CERT_COLORS.cream} 12px, ${CERT_COLORS.beigePattern} 12px, ${CERT_COLORS.beigePattern} 13px)`,
    `repeating-linear-gradient(-45deg, transparent 0px, transparent 24px, ${CERT_COLORS.beige} 24px, ${CERT_COLORS.beige} 25px)`,
  ].join(", "),
};

function CornerMotif({
  top,
  left,
  right,
  bottom,
}: {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) {
  const pos: CSSProperties = {
    position: "absolute",
    width: 56,
    height: 56,
    zIndex: 4,
    backgroundColor: CERT_COLORS.navy,
    border: `2px solid ${CERT_COLORS.gold}`,
    boxSizing: "border-box",
  };
  if (top !== undefined) pos.top = top;
  if (left !== undefined) pos.left = left;
  if (right !== undefined) pos.right = right;
  if (bottom !== undefined) pos.bottom = bottom;

  return (
    <div style={pos}>
      <div
        style={{
          position: "absolute",
          inset: 5,
          border: `1px solid ${CERT_COLORS.gold}`,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 14,
          border: `1px solid ${CERT_COLORS.goldPale}`,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 8,
          height: 8,
          margin: "-4px 0 0 -4px",
          backgroundColor: CERT_COLORS.gold,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

function MosqueWatermark() {
  return (
    <svg
      width="280"
      height="160"
      viewBox="0 0 280 160"
      style={{
        position: "absolute",
        left: "50%",
        top: "58%",
        transform: "translate(-50%, -50%)",
        opacity: 0.05,
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <ellipse cx="140" cy="130" rx="100" ry="14" fill={CERT_COLORS.navy} />
      <rect x="95" y="72" width="90" height="58" fill={CERT_COLORS.navy} />
      <path d="M72 72 L140 18 L208 72 Z" fill={CERT_COLORS.navy} />
      <circle cx="140" cy="52" r="10" fill={CERT_COLORS.gold} />
      <rect x="55" y="78" width="18" height="52" fill={CERT_COLORS.navy} />
      <rect x="207" y="78" width="18" height="52" fill={CERT_COLORS.navy} />
    </svg>
  );
}

/** Visible logo viewport — scales image to crop file letterbox padding (display only). */
const LOGO_VIEWPORT_HEIGHT = 132;
const LOGO_IMAGE_WIDTH = 980;
const LOGO_IMAGE_SCALE = 1.26;

function LogoBanner({ logoUrl }: { logoUrl: string }) {
  return (
    <div
      style={{
        margin: "6px 16px 0",
        padding: "6px",
        border: `3px solid ${CERT_COLORS.gold}`,
        borderRadius: 10,
        backgroundColor: CERT_COLORS.white,
        boxSizing: "border-box",
        flexShrink: 0,
        boxShadow: "inset 0 0 0 1px #071A3D",
      }}
    >
      <div
        style={{
          width: "100%",
          height: LOGO_VIEWPORT_HEIGHT,
          position: "relative",
          overflow: "hidden",
          backgroundColor: CERT_COLORS.white,
          borderRadius: 6,
        }}
      >
        <img
          src={logoUrl}
          alt="Ignite School — Department of Islamic Education"
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: LOGO_IMAGE_WIDTH,
            maxWidth: "none",
            height: "auto",
            display: "block",
            transform: `translate(-50%, -50%) scale(${LOGO_IMAGE_SCALE})`,
            transformOrigin: "center center",
            imageOrientation: "from-image",
          }}
        />
      </div>
    </div>
  );
}

function GoldDiamond() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        backgroundColor: CERT_COLORS.gold,
        transform: "rotate(45deg)",
        margin: "0 12px",
        verticalAlign: "middle",
      }}
    />
  );
}

function ScoreIcon({ type }: { type: "score" | "percent" | "grade" }) {
  const common = {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: `2px solid ${CERT_COLORS.gold}`,
    backgroundColor: CERT_COLORS.darkGreen,
    margin: "0 auto 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  if (type === "score") {
    return (
      <div style={common}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="3" y="5" width="14" height="11" rx="1" fill="none" stroke={CERT_COLORS.gold} strokeWidth="1.5" />
          <line x1="6" y1="9" x2="14" y2="9" stroke={CERT_COLORS.gold} strokeWidth="1.5" />
          <line x1="6" y1="12" x2="11" y2="12" stroke={CERT_COLORS.gold} strokeWidth="1.5" />
        </svg>
      </div>
    );
  }
  if (type === "percent") {
    return (
      <div style={common}>
        <span style={{ color: CERT_COLORS.gold, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>%</span>
      </div>
    );
  }
  return (
    <div style={common}>
      <span style={{ color: CERT_COLORS.gold, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>★</span>
    </div>
  );
}

function ScoreCard({
  type,
  labelEn,
  labelAr,
  value,
}: {
  type: "score" | "percent" | "grade";
  labelEn: string;
  labelAr: string;
  value: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        border: `2px solid ${CERT_COLORS.gold}`,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: CERT_COLORS.white,
        boxSizing: "border-box",
        boxShadow: "0 4px 14px #071A3D20",
      }}
    >
      <div
        style={{
          background: `linear-gradient(180deg, ${CERT_COLORS.navy} 0%, ${CERT_COLORS.darkGreen} 100%)`,
          padding: "6px 8px",
          textAlign: "center",
          borderBottom: `2px solid ${CERT_COLORS.gold}`,
        }}
      >
        <div style={{ fontSize: 9, color: CERT_COLORS.goldPale, direction: "rtl", lineHeight: 1.2 }}>
          {labelAr}
        </div>
        <div style={{ fontSize: 9, color: CERT_COLORS.white, fontWeight: 700, direction: "ltr", lineHeight: 1.2 }}>
          {labelEn}
        </div>
      </div>
      <div style={{ padding: "8px 8px 7px", textAlign: "center", backgroundColor: CERT_COLORS.beige }}>
        <ScoreIcon type={type} />
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: CERT_COLORS.navy,
            lineHeight: 1.15,
            direction: "ltr",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  labelEn,
  labelAr,
  value,
}: {
  labelEn: string;
  labelAr: string;
  value: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        border: `2px solid ${CERT_COLORS.gold}`,
        borderRadius: 8,
        backgroundColor: CERT_COLORS.white,
        padding: "8px 10px",
        textAlign: "center",
        boxSizing: "border-box",
        boxShadow: "0 2px 8px #071A3D14",
      }}
    >
      <div style={{ fontSize: 9, color: CERT_COLORS.gray, direction: "rtl", marginBottom: 2 }}>
        {labelAr}
      </div>
      <div style={{ fontSize: 9, color: CERT_COLORS.gray, marginBottom: 6, direction: "ltr", fontWeight: 600 }}>
        {labelEn}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: CERT_COLORS.navy,
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function CertificatePageBody({
  data,
  logoUrl,
}: {
  data: QuizCertificateDisplayData;
  logoUrl: string;
}) {
  const lessonAr = data.lessonTitle.ar?.trim() || data.lessonTitle.en?.trim() || "—";
  const lessonEn = data.lessonTitle.en?.trim() || data.lessonTitle.ar?.trim() || "—";
  const lessonDisplay =
    lessonAr !== lessonEn ? `${lessonEn} / ${lessonAr}` : lessonEn;
  const gradeAr = data.gradeName.ar?.trim() || data.gradeName.en?.trim() || "—";
  const gradeEn = data.gradeName.en?.trim() || data.gradeName.ar?.trim() || "—";
  const gradeDisplay = gradeAr !== gradeEn ? `${gradeEn} / ${gradeAr}` : gradeEn;

  const studentNameEn = data.studentName;
  const studentNameAr = data.studentNameAr;

  const nameEnStyle: CSSProperties = {
    fontSize: 26,
    fontWeight: 700,
    color: CERT_COLORS.navy,
    margin: "8px 0 6px",
    padding: "4px 0 8px",
    borderBottom: `3px solid ${CERT_COLORS.gold}`,
    lineHeight: 1.15,
    wordBreak: "break-word",
    fontFamily: "Georgia, 'Times New Roman', serif",
  };

  const nameArStyle: CSSProperties = {
    ...nameEnStyle,
    direction: "rtl",
  };

  const colStyle: CSSProperties = {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.55,
    color: CERT_COLORS.darkGreen,
    padding: "0 8px",
    boxSizing: "border-box",
  };

  return (
    <>
      <div style={{ position: "absolute", inset: 0, ...PATTERN_BG, zIndex: 0 }} />
      <MosqueWatermark />

      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `4px solid ${CERT_COLORS.navy}`,
          pointerEvents: "none",
          boxSizing: "border-box",
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 8,
          border: `2px solid ${CERT_COLORS.gold}`,
          pointerEvents: "none",
          boxSizing: "border-box",
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 13,
          border: `1px solid ${CERT_COLORS.gold}`,
          pointerEvents: "none",
          boxSizing: "border-box",
          zIndex: 3,
        }}
      />

      <CornerMotif top={6} left={6} />
      <CornerMotif top={6} right={6} />
      <CornerMotif bottom={6} left={6} />
      <CornerMotif bottom={6} right={6} />

      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 5,
        }}
      >
        <LogoBanner logoUrl={logoUrl} />

        <div
          style={{
            padding: "4px 32px 8px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            minHeight: 0,
          }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 4, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
              <GoldDiamond />
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  direction: "rtl",
                  color: CERT_COLORS.navy,
                  lineHeight: 1.1,
                }}
              >
                شهادة إنجاز
              </span>
              <GoldDiamond />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: CERT_COLORS.darkGreen,
                letterSpacing: 2.2,
                direction: "ltr",
              }}
            >
              CERTIFICATE OF ACHIEVEMENT
            </div>
            <div
              style={{
                width: 240,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${CERT_COLORS.gold}, transparent)`,
                margin: "5px auto 0",
              }}
            />
          </div>

          {/* Two-column body */}
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 6,
              flexShrink: 0,
              backgroundColor: CERT_COLORS.beige,
              border: `2px solid ${CERT_COLORS.gold}`,
              borderRadius: 10,
              padding: "8px 6px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ ...colStyle, direction: "ltr", textAlign: "left" }}>
              <div style={{ fontWeight: 700, color: CERT_COLORS.navy, marginBottom: 4, fontSize: 12 }}>
                Ignite School – Department of Islamic Education
              </div>
              <div style={{ marginBottom: 2 }}>is proud to award this certificate to:</div>
              <div style={nameEnStyle}>{studentNameEn}</div>
              <div style={{ fontSize: 11 }}>
                for successfully completing the lesson assessment and achieving the score shown below.
              </div>
            </div>

            <div
              style={{
                width: 3,
                backgroundColor: CERT_COLORS.gold,
                margin: "0 10px",
                flexShrink: 0,
                borderRadius: 2,
                boxShadow: "0 0 6px #C9A22740",
              }}
            />

            <div style={{ ...colStyle, direction: "rtl", textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: CERT_COLORS.navy, marginBottom: 4, fontSize: 12 }}>
                تتشرف مدرسة إغنايت – قسم التربية الإسلامية
              </div>
              <div style={{ marginBottom: 2 }}>بمنح هذه الشهادة إلى الطالب/ـة:</div>
              <div style={nameArStyle}>{studentNameAr}</div>
              <div style={{ fontSize: 11 }}>
                وذلك لإتمامه/إتمامها متطلبات الدرس والاختبار الإلكتروني بنجاح.
              </div>
            </div>
          </div>

          {/* Score cards */}
          <div
            style={{
              display: "flex",
              gap: 14,
              marginBottom: 6,
              flexShrink: 0,
            }}
          >
            <ScoreCard
              type="score"
              labelEn="Final Score"
              labelAr="الدرجة النهائية"
              value={`${data.finalScore} / ${data.totalPoints}`}
            />
            <ScoreCard
              type="percent"
              labelEn="Percentage"
              labelAr="النسبة المئوية"
              value={`${data.percentage}%`}
            />
            <ScoreCard
              type="grade"
              labelEn="Grade"
              labelAr="التقدير"
              value={`${data.gradeLabelEn} / ${data.gradeLabelAr}`}
            />
          </div>

          {/* Lesson details — 3 wider cards */}
          <div style={{ marginBottom: 6, flexShrink: 0 }}>
            <div
              style={{
                background: `linear-gradient(90deg, ${CERT_COLORS.navy}, ${CERT_COLORS.darkGreen})`,
                border: `2px solid ${CERT_COLORS.gold}`,
                borderRadius: "8px 8px 0 0",
                padding: "5px 12px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: CERT_COLORS.gold, direction: "rtl" }}>
                بيانات الدرس
              </span>
              <span style={{ fontSize: 10, color: CERT_COLORS.white, margin: "0 10px" }}>/</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: CERT_COLORS.white, letterSpacing: 1.5 }}>
                LESSON DETAILS
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "8px",
                backgroundColor: CERT_COLORS.cream,
                border: `2px solid ${CERT_COLORS.gold}`,
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
              }}
            >
              <DetailCard labelEn="Lesson Title" labelAr="عنوان الدرس" value={lessonDisplay} />
              <DetailCard labelEn="Grade" labelAr="الصف" value={gradeDisplay} />
              <DetailCard
                labelEn="Completion Date"
                labelAr="تاريخ الإنجاز"
                value={data.completionDate}
              />
            </div>
          </div>

          {/* Signature footer */}
          <div
            style={{
              marginTop: "auto",
              flexShrink: 0,
              borderTop: `2px solid ${CERT_COLORS.gold}`,
              paddingTop: 8,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                minWidth: 360,
                maxWidth: 520,
                textAlign: "center",
                backgroundColor: CERT_COLORS.white,
                border: `2px solid ${CERT_COLORS.gold}`,
                borderRadius: 10,
                padding: "10px 24px 12px",
                boxSizing: "border-box",
                boxShadow: "0 3px 12px #071A3D18",
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: CERT_COLORS.gray,
                  marginBottom: 8,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                }}
              >
                Electronic Signature / التوقيع الإلكتروني
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, direction: "rtl", color: CERT_COLORS.navy }}>
                {CERTIFICATE_SIGNATURE.arName}
              </div>
              <div style={{ fontSize: 11, direction: "rtl", color: CERT_COLORS.gray, marginTop: 3 }}>
                {CERTIFICATE_SIGNATURE.arTitle}
              </div>
              <div
                style={{
                  width: 120,
                  height: 2,
                  backgroundColor: CERT_COLORS.gold,
                  margin: "8px auto",
                }}
              />
              <div style={{ fontSize: 15, fontWeight: 700, direction: "ltr", color: CERT_COLORS.navy }}>
                {CERTIFICATE_SIGNATURE.enName}
              </div>
              <div style={{ fontSize: 10, color: CERT_COLORS.gray, marginTop: 3, direction: "ltr" }}>
                {CERTIFICATE_SIGNATURE.enTitle}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function certificatePageStyle() {
  return {
    width: CERTIFICATE_WIDTH_PX,
    height: CERTIFICATE_HEIGHT_PX,
    backgroundColor: CERT_COLORS.cream,
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: CERT_COLORS.darkGreen,
    position: "relative" as const,
    boxSizing: "border-box" as const,
    overflow: "hidden" as const,
    margin: 0,
    padding: 0,
    border: "none",
  };
}

export function getCertificateLogoUrl(): string {
  return certificateLogoUrl();
}
