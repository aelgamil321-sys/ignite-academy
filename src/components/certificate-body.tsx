/**
 * GLOBAL CERTIFICATE TEMPLATE
 *
 * CertificatePageBody is the single approved layout for all platform certificates:
 * lesson quizzes, assessments, projects, assignments, and future completion types.
 * Every grade level (KG1, KG2, Grades 1–12) renders through this component.
 */
import type { CSSProperties } from "react";
import type { CertificateDisplayData } from "@/lib/certificate";
import { L } from "@/lib/i18n";
import {
  CERTIFICATE_SIGNATURE,
  certificateIslamicLogoUrl,
  certificateSchoolLogoUrl,
  certificateSignatureArImageUrl,
  certificateSignatureEnImageUrl,
} from "@/lib/certificate-branding";

/** Landscape A4 at ~96dpi for html2canvas capture */
export const CERTIFICATE_WIDTH_PX = 1123;
export const CERTIFICATE_HEIGHT_PX = 794;

/** Fixed vertical grid (px) — must fit inside CERTIFICATE_HEIGHT_PX */
const GRID = {
  header: 105,
  headerLogoWidth: 250,
  name: 128,
  scores: 135,
  lesson: 112,
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

function HeaderLogoBox({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        width: GRID.headerLogoWidth,
        height: GRID.header,
        flexShrink: 0,
        boxSizing: "border-box",
        padding: 4,
        border: `2px solid ${CERT_COLORS.gold}`,
        borderRadius: 8,
        backgroundColor: CERT_COLORS.white,
        overflow: "hidden",
      }}
    >
      <img
        src={src}
        alt={alt}
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
  );
}

function CertificateHeader({
  schoolLogoUrl,
  islamicLogoUrl,
}: {
  schoolLogoUrl: string;
  islamicLogoUrl: string;
}) {
  return (
    <div
      style={{
        height: GRID.header,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        gap: 10,
        boxSizing: "border-box",
      }}
    >
      <HeaderLogoBox src={islamicLogoUrl} alt={L("Department of Islamic Education", "قسم التربية الإسلامية").en} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: GRID.header,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 8px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            direction: "rtl",
            color: CERT_COLORS.navy,
            lineHeight: 1.05,
          }}
        >
          شهادة إنجاز
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: CERT_COLORS.darkGreen,
            letterSpacing: 1.2,
            direction: "ltr",
            lineHeight: 1.2,
            marginTop: 6,
          }}
        >
          {L("Certificate of Achievement", "شهادة إنجاز").en}
        </div>
        <div
          style={{
            width: 200,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${CERT_COLORS.gold}, transparent)`,
            marginTop: 8,
          }}
        />
      </div>
      <HeaderLogoBox src={schoolLogoUrl} alt="Ignite School" />
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
        <div style={{ fontSize: 10, color: CERT_COLORS.goldPale, direction: "rtl", lineHeight: 1.15 }}>
          {labelAr}
        </div>
        <div style={{ fontSize: 10, color: CERT_COLORS.white, fontWeight: 700, direction: "ltr", lineHeight: 1.15 }}>
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
  flex = "1 1 0",
}: {
  labelEn: string;
  labelAr: string;
  value: string;
  flex?: string;
}) {
  return (
    <div
      style={{
        flex,
        minWidth: 0,
        height: "100%",
        border: `2px solid ${CERT_COLORS.gold}`,
        borderRadius: 8,
        backgroundColor: CERT_COLORS.white,
        padding: "5px 6px",
        textAlign: "center",
        boxSizing: "border-box",
        boxShadow: "0 2px 8px #071A3D14",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 10, color: CERT_COLORS.gray, direction: "rtl", lineHeight: 1.15 }}>
        {labelAr}
      </div>
      <div style={{ fontSize: 10, color: CERT_COLORS.gray, marginBottom: 5, direction: "ltr", fontWeight: 600, lineHeight: 1.15 }}>
        {labelEn}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: CERT_COLORS.navy,
          lineHeight: 1.3,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const SIGNATURE_CARD_WIDTH = 260;

function SignatureCard({
  imageUrl,
  imageAlt,
  name,
  title,
  direction,
}: {
  imageUrl: string;
  imageAlt: string;
  name: string;
  title: string;
  direction: "rtl" | "ltr";
}) {
  return (
    <div
      style={{
        width: SIGNATURE_CARD_WIDTH,
        height: GRID.footer,
        flexShrink: 0,
        boxSizing: "border-box",
        backgroundColor: CERT_COLORS.white,
        border: `2px solid ${CERT_COLORS.gold}`,
        borderRadius: 10,
        padding: "3px 6px",
        boxShadow: "0 3px 12px #071A3D18",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        crossOrigin="anonymous"
        style={{
          display: "block",
          width: 135,
          height: "auto",
          maxHeight: 40,
          objectFit: "contain",
          objectPosition: "center center",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          direction,
          color: CERT_COLORS.navy,
          lineHeight: 1.1,
          marginTop: 2,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 7,
          direction,
          color: CERT_COLORS.gray,
          lineHeight: 1.1,
          marginTop: 1,
        }}
      >
        {title}
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
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      <SignatureCard
        imageUrl={certificateSignatureEnImageUrl()}
        imageAlt="Ayman Abdullah signature"
        name={CERTIFICATE_SIGNATURE.enName}
        title={CERTIFICATE_SIGNATURE.enTitle}
        direction="ltr"
      />
      <SignatureCard
        imageUrl={certificateSignatureArImageUrl()}
        imageAlt="توقيع أيمن عبد الله"
        name={CERTIFICATE_SIGNATURE.arName}
        title={CERTIFICATE_SIGNATURE.arTitle}
        direction="rtl"
      />
    </div>
  );
}

export function CertificatePageBody({ data }: { data: CertificateDisplayData }) {
  const lessonAr = data.lessonTitle.ar?.trim() || data.lessonTitle.en?.trim() || "—";
  const lessonEn = data.lessonTitle.en?.trim() || data.lessonTitle.ar?.trim() || "—";
  const lessonDisplay =
    lessonAr !== lessonEn ? `${lessonEn} / ${lessonAr}` : lessonEn;
  const gradeAr = data.gradeName.ar?.trim() || data.gradeName.en?.trim() || "—";
  const gradeEn = data.gradeName.en?.trim() || data.gradeName.ar?.trim() || "—";
  const gradeDisplay = gradeAr !== gradeEn ? `${gradeEn} / ${gradeAr}` : gradeEn;

  const schoolLogoUrl = certificateSchoolLogoUrl();
  const islamicLogoUrl = certificateIslamicLogoUrl();

  const colText: CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 1.4,
    color: CERT_COLORS.darkGreen,
    padding: "0 8px",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const nameStyle: CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    color: CERT_COLORS.navy,
    margin: "6px 0 4px",
    paddingBottom: 5,
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
        <CertificateHeader schoolLogoUrl={schoolLogoUrl} islamicLogoUrl={islamicLogoUrl} />

        {/* Name section */}
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
            <div style={{ fontWeight: 700, color: CERT_COLORS.navy, fontSize: 12, lineHeight: 1.25 }}>
              {L("Ignite School – Department of Islamic Education", "مدرسة اجنايت – قسم التربية الإسلامية").en}
            </div>
            <div style={{ fontSize: 11, marginTop: 3 }}>is proud to award this certificate to:</div>
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
            <div style={{ fontWeight: 700, color: CERT_COLORS.navy, fontSize: 12, lineHeight: 1.25 }}>
              تتشرف مدرسة اجنايت – قسم التربية الإسلامية
            </div>
            <div style={{ fontSize: 11, marginTop: 3 }}>بمنح هذه الشهادة إلى الطالب/ـة:</div>
            <div style={{ ...nameStyle, direction: "rtl" }}>{data.studentNameAr}</div>
          </div>
        </div>

        {/* Score cards */}
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
            valueSize={30}
          />
          <ScoreCard
            labelEn="Percentage"
            labelAr="النسبة المئوية"
            value={`${data.percentage}%`}
            valueSize={30}
          />
          <ScoreCard
            labelEn="Grade"
            labelAr="التقدير"
            value={`${data.gradeLabelEn} / ${data.gradeLabelAr}`}
            valueSize={28}
          />
        </div>

        {/* Lesson details */}
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
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 26,
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: CERT_COLORS.gold,
                direction: "rtl",
                lineHeight: 1,
              }}
            >
              بيانات الدرس
            </span>
            <span style={{ fontSize: 10, color: CERT_COLORS.white, margin: "0 8px", lineHeight: 1 }}>/</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: CERT_COLORS.white,
                letterSpacing: 1.2,
                lineHeight: 1,
              }}
            >
              {L("LESSON DETAILS", "بيانات الدرس").en}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: 6,
              padding: "4px",
              backgroundColor: CERT_COLORS.cream,
              border: `2px solid ${CERT_COLORS.gold}`,
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              boxSizing: "border-box",
              minHeight: 0,
            }}
          >
            <DetailCard
              labelEn="Lesson Title"
              labelAr="عنوان الدرس"
              value={lessonDisplay}
              flex="2.6 1 0"
            />
            <DetailCard labelEn="Grade" labelAr="الصف" value={gradeDisplay} flex="1 1 0" />
            <DetailCard
              labelEn="Completion Date"
              labelAr="تاريخ الإنجاز"
              value={data.completionDate}
              flex="1 1 0"
            />
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

