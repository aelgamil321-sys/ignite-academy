import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  header: "h-11 w-[5.5rem] sm:h-14 sm:w-36 md:h-16 md:w-40",
  hero: "h-20 w-48 sm:h-24 sm:w-56 md:h-28 md:w-64",
} as const;

type BrandLogoProps = {
  src: string;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function BrandLogo({ src, alt, size = "header", className }: BrandLogoProps) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center", SIZE_CLASS[size], className)}>
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain object-center"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
