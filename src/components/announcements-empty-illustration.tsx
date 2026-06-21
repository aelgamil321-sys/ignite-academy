/** Decorative empty-state illustration — gold + navy Ignite branding. */
export function AnnouncementsEmptyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="ann-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F2B21B" />
          <stop offset="100%" stopColor="#D9A015" />
        </linearGradient>
        <linearGradient id="ann-navy" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3D4554" />
          <stop offset="100%" stopColor="#2F3542" />
        </linearGradient>
        <filter id="ann-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft platform base */}
      <ellipse cx="80" cy="122" rx="56" ry="10" fill="#F2B21B" opacity="0.12" />

      {/* Bulletin board */}
      <rect x="28" y="24" width="104" height="78" rx="10" fill="url(#ann-navy)" stroke="#F2B21B" strokeWidth="1.5" opacity="0.95" />
      <rect x="36" y="32" width="88" height="62" rx="6" fill="#252A33" stroke="#F2B21B" strokeWidth="0.75" strokeOpacity="0.35" />

      {/* Pin dots */}
      <circle cx="48" cy="30" r="3" fill="url(#ann-gold)" />
      <circle cx="80" cy="28" r="3" fill="url(#ann-gold)" />
      <circle cx="112" cy="30" r="3" fill="url(#ann-gold)" />

      {/* Notice lines */}
      <rect x="44" y="42" width="48" height="4" rx="2" fill="#F2B21B" opacity="0.85" />
      <rect x="44" y="52" width="72" height="3" rx="1.5" fill="#FFFFFF" opacity="0.22" />
      <rect x="44" y="60" width="64" height="3" rx="1.5" fill="#FFFFFF" opacity="0.18" />
      <rect x="44" y="68" width="56" height="3" rx="1.5" fill="#FFFFFF" opacity="0.14" />

      {/* Megaphone */}
      <g filter="url(#ann-glow)" transform="translate(92, 58)">
        <path
          d="M0 8 L18 2 L18 22 L0 16 Z"
          fill="url(#ann-gold)"
        />
        <path
          d="M18 6 C28 6 34 12 34 12 C34 12 28 18 18 18 L18 6 Z"
          fill="#F2B21B"
          opacity="0.75"
        />
        <rect x="-6" y="6" width="8" height="12" rx="2" fill="#D9A015" />
      </g>

      {/* Sparkle accents */}
      <path d="M18 48 L20 54 L26 56 L20 58 L18 64 L16 58 L10 56 L16 54 Z" fill="#F2B21B" opacity="0.7" />
      <path d="M138 72 L139.5 76 L143.5 77.5 L139.5 79 L138 83 L136.5 79 L132.5 77.5 L136.5 76 Z" fill="#F2B21B" opacity="0.5" />
    </svg>
  );
}
