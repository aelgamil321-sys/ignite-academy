import type { CSSProperties } from "react";
import type { QuizCertificateDisplayData } from "@/lib/quiz-certificate";
import {
  CERTIFICATE_SIGNATURE,
  certificateLogoUrl,
} from "@/lib/certificate-branding";

/** Landscape A4 at ~96dpi for html2canvas capture */
export const CERTIFICATE_WIDTH_PX = 1123;
export const CERTIFICATE_HEIGHT_PX = 794;

/** Fixed vertical grid (px) — must fit inside CERTIFICATE_HEIGHT_PX */
const GRID = {
  logo: 125,
  title: 60,
  name: 115,
  scores: 120,
  lesson: 95,
  footer: 90,
  padX: 28,
  padTop: 14,
  padBottom: 12,
} as const;

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
        top: "54%",
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

function LogoBanner({ logoUrl }: { logoUrl: string }) {
  return (
    <div
      style={{
        height: GRID.logo,
        flexShrink: 0,
        boxSizing: "border-box",
        padding: "4px",
        border: `3px solid ${CERT_COLORS.gold}`,
        borderRadius: 10,
        backgroundColor: CERT_COLORS.white,
        boxShadow: "inset 0 0 0 1px #071A3D",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: CERT_COLORS.white,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <img
          src={logoUrl}
          alt="Ignite School — Department of Islamic Education"
          crossOrigin="anonymous"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center center",
            backgroundColor: CERT_COLORS.white,
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
        width: 8,
        height: 8,
        backgroundColor: CERT_COLORS.gold,
        transform: "rotate(45deg)",
        margin: "0 10px",
        flexShrink: 0,
      }}
    />
  );
}

function TitleBlock() {
  return (
    <div
      style={{
        height: GRID.title,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GoldDiamond />
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            direction: "rtl",
            color: CERT_COLORS.navy,
            lineHeight: 1,
          }}
        >
          شهادة إنجاز
        </span>
        <GoldDiamond />
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: CERT_COLORS.darkGreen,
          letterSpacing: 2,
          direction: "ltr",
          lineHeight: 1.2,
          marginTop: 4,
        }}
      >
        CERTIFICATE OF ACHIEVEMENT
      </div>
      <div
        style={{
          width: 220,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${CERT_COLORS.gold}, transparent)`,
          marginTop: 5,
        }}
      />
    </div>
  );
}

function ScoreCard({
  labelEn,
  labelAr,
  value,
  valueSize,
}: {
  labelEn: string;
  labelAr: string;
  value: string;
  valueSize: number;
}) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        height: "100%",
        border: `2px solid ${CERT_COLORS.gold}`,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: CERT_COLORS.white,
        boxSizing: "border-box",
        boxShadow: "0 4px 14px #071A3D20",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: `linear-gradient(180deg, ${CERT_COLORS.navy} 0%, ${CERT_COLORS.darkGreen} 100%)`,
          padding: "5px 6px",
          textAlign: "center",
          borderBottom: `2px solid ${CERT_COLORS.gold}`,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 9, color: CERT_COLORS.goldPale, direction: "rtl", lineHeight: 1.15 }}>
          {labelAr}
        </div>
        <div style={{ fontSize: 9, color: CERT_COLORS.white, fontWeight: 700, direction: "ltr", lineHeight: 1.15 }}>
          {labelEn}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          backgroundColor: CERT_COLORS.beige,
          padding: "4px 8px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: valueSize,
            fontWeight: 700,
            color: CERT_COLORS.navy,
            lineHeight: 1.1,
            direction: "ltr",
            wordBreak: "break-word",
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
        height: "100%",
        border: `2px solid ${CERT_COLORS.gold}`,
        borderRadius: 8,
        backgroundColor: CERT_COLORS.white,
        padding: "6px 8px",
        textAlign: "center",
        boxSizing: "border-box",
        boxShadow: "0 2px 8px #071A3D14",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 9, color: CERT_COLORS.gray, direction: "rtl", lineHeight: 1.1 }}>
        {labelAr}
      </div>
      <div style={{ fontSize: 9, color: CERT_COLORS.gray, marginBottom: 4, direction: "ltr", fontWeight: 600, lineHeight: 1.1 }}>
        {labelEn}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: CERT_COLORS.navy,
          lineHeight: 1.25,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SignatureFooter() {
  return (
    <div
      style={{
        height: GRID.footer,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 360,
          height: GRID.footer,
          textAlign: "center",
          backgroundColor: CERT_COLORS.white,
          border: `2px solid ${CERT_COLORS.gold}`,
          borderRadius: 10,
          padding: "6px 16px",
          boxSizing: "border-box",
          boxShadow: "0 3px 12px #071A3D18",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 7, color: CERT_COLORS.gray, fontWeight: 700, letterSpacing: 0.4, lineHeight: 1.1 }}>
          Electronic Signature / التوقيع الإلكتروني
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, direction: "rtl", color: CERT_COLORS.navy, lineHeight: 1.15, marginTop: 2 }}>
          {CERTIFICATE_SIGNATURE.arName}
        </div>
        <div style={{ fontSize: 9, direction: "rtl", color: CERT_COLORS.gray, lineHeight: 1.1 }}>
          {CERTIFICATE_SIGNATURE.arTitle}
        </div>
        <div
          style={{
            width: 100,
            height: 2,
            backgroundColor: CERT_COLORS.gold,
            margin: "3px auto",
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 12, fontWeight: 700, direction: "ltr", color: CERT_COLORS.navy, lineHeight: 1.15 }}>
          {CERTIFICATE_SIGNATURE.enName}
        </div>
        <div style={{ fontSize: 8, color: CERT_COLORS.gray, direction: "ltr", lineHeight: 1.1 }}>
          {CERTIFICATE_SIGNATURE.enTitle}
        </div>
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

  const colText: CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 1.35,
    color: CERT_COLORS.darkGreen,
    padding: "0 6px",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const nameStyle: CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    color: CERT_COLORS.navy,
    margin: "4px 0",
    paddingBottom: 4,
    borderBottom: `3px solid ${CERT_COLORS.gold}`,
    lineHeight: 1.1,
    wordBreak: "break-word",
    fontFamily: "Georgia, 'Times New Roman', serif",
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

      {/* Fixed vertical grid */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          height: "100%",
          boxSizing: "border-box",
          padding: `${GRID.padTop}px ${GRID.padX}px ${GRID.padBottom}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <LogoBanner logoUrl={logoUrl} />
        <TitleBlock />

        {/* Name section — 115px */}
        <div
          style={{
            height: GRID.name,
            flexShrink: 0,
            display: "flex",
            backgroundColor: CERT_COLORS.beige,
            border: `2px solid ${CERT_COLORS.gold}`,
            borderRadius: 10,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div style={{ ...colText, direction: "ltr", textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: CERT_COLORS.navy, fontSize: 11, lineHeight: 1.2 }}>
              Ignite School – Department of Islamic Education
            </div>
            <div style={{ fontSize: 10, marginTop: 2 }}>is proud to award this certificate to:</div>
            <div style={nameStyle}>{data.studentName}</div>
          </div>

          <div
            style={{
              width: 3,
              backgroundColor: CERT_COLORS.gold,
              margin: "8px 6px",
              flexShrink: 0,
              borderRadius: 2,
            }}
          />

          <div style={{ ...colText, direction: "rtl", textAlign: "right" }}>
            <div style={{ fontWeight: 700, color: CERT_COLORS.navy, fontSize: 11, lineHeight: 1.2 }}>
              تتشرف مدرسة إغنايت – قسم التربية الإسلامية
            </div>
            <div style={{ fontSize: 10, marginTop: 2 }}>بمنح هذه الشهادة إلى الطالب/ـة:</div>
            <div style={{ ...nameStyle, direction: "rtl" }}>{data.studentNameAr}</div>
          </div>
        </div>

        {/* Score cards — 120px */}
        <div
          style={{
            height: GRID.scores,
            flexShrink: 0,
            display: "flex",
            gap: 12,
            boxSizing: "border-box",
          }}
        >
          <ScoreCard
            labelEn="Final Score"
            labelAr="الدرجة النهائية"
            value={`${data.finalScore} / ${data.totalPoints}`}
            valueSize={26}
          />
          <ScoreCard
            labelEn="Percentage"
            labelAr="النسبة المئوية"
            value={`${data.percentage}%`}
            valueSize={26}
          />
          <ScoreCard
            labelEn="Grade"
            labelAr="التقدير"
            value={`${data.gradeLabelEn} / ${data.gradeLabelAr}`}
            valueSize={24}
          />
        </div>

        {/* Lesson details — 95px */}
        <div
          style={{
            height: GRID.lesson,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: `linear-gradient(90deg, ${CERT_COLORS.navy}, ${CERT_COLORS.darkGreen})`,
              border: `2px solid ${CERT_COLORS.gold}`,
              borderRadius: "8px 8px 0 0",
              padding: "4px 12px",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: CERT_COLORS.gold, direction: "rtl" }}>
              بيانات الدرس
            </span>
            <span style={{ fontSize: 10, color: CERT_COLORS.white, margin: "0 8px" }}>/</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: CERT_COLORS.white, letterSpacing: 1.2 }}>
              LESSON DETAILS
            </span>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: 10,
              padding: "6px",
              backgroundColor: CERT_COLORS.cream,
              border: `2px solid ${CERT_COLORS.gold}`,
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              boxSizing: "border-box",
              minHeight: 0,
            }}
          >
            <DetailCard labelEn="Lesson Title" labelAr="عنوان الدرس" value={lessonDisplay} />
            <DetailCard labelEn="Grade" labelAr="الصف" value={gradeDisplay} />
            <DetailCard labelEn="Completion Date" labelAr="تاريخ الإنجاز" value={data.completionDate} />
          </div>
        </div>

        <SignatureFooter />
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
