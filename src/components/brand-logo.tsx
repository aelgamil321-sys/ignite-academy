import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  /** Full official lockup — object-contain, never crop names/tagline */
  header: "h-14 w-36 sm:h-16 sm:w-44 md:h-[4.5rem] md:w-52 lg:h-20 lg:w-64 xl:h-[5.25rem] xl:w-72",
  /** Tight header slot — same PNG, scaled down, still uncropped */
  headerCompact: "h-11 w-28 sm:h-12 sm:w-32 md:h-14 md:w-40",
  /** Dark sidebar — full lockup scaled down, no crop */
  sidebar: "h-12 w-[9.5rem] sm:h-[3.25rem] sm:w-[10.5rem]",
} as const;

type BrandLogoProps = {
  src: string;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function BrandLogo({ src, alt, size = "header", className }: BrandLogoProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-visible bg-transparent",
        SIZE_CLASS[size],
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full bg-transparent object-contain object-center"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

type DepartmentLogoCardProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Department logo inside a white hero card (260–340px on desktop). */
export function DepartmentLogoCard({ src, alt, className }: DepartmentLogoCardProps) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-white p-5 shadow-[var(--shadow-elegant)] sm:p-6",
        "max-w-[min(100%,340px)] sm:max-w-[340px]",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className="mx-auto h-auto w-full max-w-[280px] object-contain object-center"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
