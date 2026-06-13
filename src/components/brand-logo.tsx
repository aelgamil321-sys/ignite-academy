import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  /** Homepage header — wide enough for full school logo, never cropped */
  header: "h-11 w-28 sm:h-12 sm:w-32 md:h-14 md:w-40 lg:h-[3.75rem] lg:w-48 xl:h-16 xl:w-52",
  /** Compact header logo for tablet row */
  headerCompact: "h-10 w-24 sm:h-11 sm:w-28",
} as const;

type BrandLogoProps = {
  src: string;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function BrandLogo({ src, alt, size = "header", className }: BrandLogoProps) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-visible", SIZE_CLASS[size], className)}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain object-center"
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
