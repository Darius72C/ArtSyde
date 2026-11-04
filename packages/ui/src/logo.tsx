import { brand } from "./brand";

type LogoProps = {
  /** Taille du texte en pixels. Le symbole suit la même échelle. */
  size?: number;
  /** Affiche le symbole 芸 à gauche du mot ARTSYDE. */
  withSymbol?: boolean;
  className?: string;
};

/** Symbole seul : le kanji 芸 dans un cercle violet ouvert. */
export function BrandSymbol({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label={brand.name}
      className={className}
    >
      <circle
        cx="36"
        cy="36"
        r="30"
        fill="none"
        stroke={brand.colors.curseViolet}
        strokeWidth="3"
        strokeDasharray="150 30"
        strokeLinecap="round"
        transform="rotate(-60 36 36)"
      />
      <text
        x="36"
        y="49"
        textAnchor="middle"
        fontSize="38"
        fill={brand.colors.ghostWhite}
        style={{ fontFamily: "var(--font-kanji-jp), serif" }}
      >
        {brand.kanji}
      </text>
    </svg>
  );
}

/** Logo complet : symbole + ARTSYDE, avec « SYDE » en violet. */
export function Logo({ size = 32, withSymbol = true, className }: LogoProps) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4 }}
    >
      {withSymbol && <BrandSymbol size={size * 1.5} />}
      <span
        style={{
          fontFamily: "var(--font-glitch), sans-serif",
          fontSize: size,
          lineHeight: 1,
          color: brand.colors.ghostWhite,
        }}
      >
        ART<span style={{ color: brand.colors.curseViolet }}>SYDE</span>
      </span>
    </span>
  );
}
