import type { CSSProperties, ReactNode, Ref } from "react";
import { BRAND, brandLogoTransparentUrl } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type GhirasWatermarkVariant =
  | "top"
  | "bottom"
  | "corner"
  | "centered-background"
  | "section"
  | "print";

export type GhirasWatermarkTone = "light" | "dark";

export type GhirasWatermarkSize = "sm" | "md" | "lg" | "xl";

export type GhirasWatermarkPosition =
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "center";

type GhirasWatermarkProps = {
  variant?: GhirasWatermarkVariant;
  position?: GhirasWatermarkPosition;
  size?: GhirasWatermarkSize;
  tone?: GhirasWatermarkTone;
  opacity?: number;
  rotate?: number;
  className?: string;
  /** Hide below this breakpoint (watermark only). */
  hideBelow?: "sm" | "md" | "lg";
};

const SIZE_CLASS: Record<GhirasWatermarkSize, string> = {
  sm: "h-[150px] w-[150px] sm:h-[180px] sm:w-[180px]",
  md: "h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] md:h-[300px] md:w-[300px]",
  lg: "h-[200px] w-[200px] sm:h-[260px] sm:w-[260px] md:h-[380px] md:w-[380px] lg:h-[460px] lg:w-[460px]",
  xl: "h-[220px] w-[220px] sm:h-[280px] sm:w-[280px] md:h-[440px] md:w-[440px] lg:h-[520px] lg:w-[520px]",
};

const TONE_OPACITY_VALUE: Record<GhirasWatermarkTone, number> = {
  light: 0.038,
  dark: 0.055,
};

const POSITION_CLASS: Record<GhirasWatermarkPosition, string> = {
  "top-start": "top-[-18%] start-[-16%]",
  "top-end": "top-[-18%] end-[-16%]",
  "bottom-start": "bottom-[-14%] start-[-16%]",
  "bottom-end": "bottom-[-14%] end-[-16%]",
  center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
};

const VARIANT_POSITION: Record<GhirasWatermarkVariant, GhirasWatermarkPosition> = {
  top: "top-end",
  bottom: "bottom-start",
  corner: "top-end",
  "centered-background": "center",
  section: "bottom-end",
  print: "center",
};

const HIDE_BELOW: Record<NonNullable<GhirasWatermarkProps["hideBelow"]>, string> = {
  sm: "hidden sm:block",
  md: "hidden md:block",
  lg: "hidden lg:block",
};

/**
 * Decorative GHIRAS mark. Never interactive. Always behind content (z-0).
 * Uses the official PNG only — no recolor.
 */
export function GhirasWatermark({
  variant = "corner",
  position,
  size = "lg",
  tone = "light",
  opacity,
  rotate,
  className,
  hideBelow,
}: GhirasWatermarkProps) {
  const resolvedPosition = position ?? VARIANT_POSITION[variant];
  const isPrint = variant === "print" || variant === "centered-background";
  const printSize = variant === "print" ? "xl" : size;
  const resolvedOpacity = opacity ?? TONE_OPACITY_VALUE[tone];
  const imgStyle: CSSProperties = {
    opacity: resolvedOpacity,
    ...(rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : {}),
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-0 select-none overflow-hidden",
        hideBelow ? HIDE_BELOW[hideBelow] : null,
        POSITION_CLASS[resolvedPosition],
        className,
      )}
    >
      <img
        src={brandLogoTransparentUrl()}
        alt=""
        draggable={false}
        className={cn(
          "max-w-none object-contain object-center",
          SIZE_CLASS[printSize],
          rotate === undefined && !isPrint && variant === "section" ? "rotate-[-8deg]" : null,
        )}
        style={imgStyle}
      />
    </div>
  );
}

type AmbientDensity = "page" | "dashboard" | "sparse";

type GhirasAmbientFieldProps = {
  tone?: GhirasWatermarkTone;
  density?: AmbientDensity;
  className?: string;
  /** Viewport-pinned field for public/auth shells. Dashboard panes use the default absolute field. */
  pinned?: boolean;
};

/**
 * Up to two restrained marks: upper opposite corner + lower opposite corner.
 * Logical inset-inline so RTL (ar/ur) lands upper-left / lower-right.
 */
export function GhirasAmbientField({
  tone = "light",
  density = "page",
  className,
  pinned = false,
}: GhirasAmbientFieldProps) {
  const primarySize: GhirasWatermarkSize = density === "dashboard" ? "lg" : density === "sparse" ? "md" : "xl";
  const showSecond = density !== "sparse";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none z-0 overflow-hidden select-none",
        pinned ? "fixed inset-0" : "absolute inset-0",
        className,
      )}
    >
      <GhirasWatermark variant="corner" position="top-end" size={primarySize} tone={tone} />
      {showSecond ? (
        <GhirasWatermark
          variant="bottom"
          position="bottom-start"
          size={density === "dashboard" ? "md" : "lg"}
          tone={tone}
          hideBelow="md"
        />
      ) : null}
    </div>
  );
}

/** Full-page chrome: ambient marks sit behind header, main, and footer. */
export function GhirasSiteFrame({
  children,
  className,
  tone = "light",
  density = "page",
}: {
  children: ReactNode;
  className?: string;
  tone?: GhirasWatermarkTone;
  density?: AmbientDensity;
}) {
  return (
    <div className={cn("relative flex min-h-screen flex-col overflow-x-hidden", className)}>
      <GhirasAmbientField tone={tone} density={density} pinned />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Dashboard content column: watermark stays in the pane, never over sidebar or sticky nav. */
export function GhirasDashboardPane({
  children,
  className,
  mainClassName,
  mainRef,
}: {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  mainRef?: Ref<HTMLMainElement>;
}) {
  return (
    <div className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden", className)}>
      <GhirasAmbientField density="dashboard" />
      <main
        ref={mainRef}
        className={cn(
          "relative z-10 h-full min-h-0 overflow-x-hidden overflow-y-auto p-4 sm:p-5 lg:p-6",
          mainClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function GhirasBrandSignature({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-transparent",
          compact ? "h-10 w-28" : "h-12 w-36",
        )}
      >
        <img
          src={brandLogoTransparentUrl()}
          alt=""
          className="h-full w-full object-contain object-center"
          draggable={false}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate font-display text-lg leading-tight">
          {BRAND.nameEn} | {BRAND.nameAr}
        </div>
        <div className="text-[11px] leading-snug opacity-75">
          {BRAND.taglineEn}
        </div>
      </div>
    </div>
  );
}

/** Inline-style centered mark for certificates / print (no Tailwind; html2canvas-safe). */
export function ghirasPrintWatermarkStyle(sizePx = 420, opacity = 0.03): CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: sizePx,
    height: sizePx,
    margin: 0,
    padding: 0,
    transform: "translate(-50%, -50%)",
    objectFit: "contain",
    objectPosition: "center",
    opacity,
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 1,
  };
}
