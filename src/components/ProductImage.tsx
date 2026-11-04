import type { Art } from "@/lib/products";

/** Relative luminance → pick a print colour that reads on the fabric. */
function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

function Print({ art, ink }: { art?: Art | string; ink: string }) {
  switch (art) {
    case "wordmark":
      return (
        <text x="200" y="168" textAnchor="middle" fill={ink} fontFamily="var(--font-display)" fontSize="15" letterSpacing="4.5">
          ARTSYDE
        </text>
      );
    case "line":
      return (
        <g fill="none" stroke={ink} strokeWidth="1.6">
          <path d="M160 175 H240" />
          <circle cx="200" cy="160" r="11" />
          <text x="200" y="196" textAnchor="middle" fill={ink} stroke="none" fontFamily="var(--font-body)" fontSize="7" letterSpacing="3">
            HORIZON
          </text>
        </g>
      );
    case "sun":
      return (
        <g stroke={ink} strokeWidth="1.4" fill="none">
          <circle cx="200" cy="165" r="16" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M200 140 V132" transform={`rotate(${i * 30} 200 165)`} />
          ))}
        </g>
      );
    case "script":
      return (
        <text x="200" y="170" textAnchor="middle" fill={ink} fontFamily="var(--font-display)" fontStyle="italic" fontSize="30">
          Signature
        </text>
      );
    case "crest":
      return (
        <g fill="none" stroke={ink} strokeWidth="1.4">
          <path d="M184 145 H216 V170 Q216 185 200 192 Q184 185 184 170 Z" />
          <text x="200" y="174" textAnchor="middle" fill={ink} stroke="none" fontFamily="var(--font-display)" fontSize="16">
            M
          </text>
        </g>
      );
    default:
      return null;
  }
}

/**
 * Refined t-shirt illustration (no outline, soft shading) used until real product photos exist.
 * `color` is the fabric colour; `art` a minimal chest print.
 */
export function TeeIllustration({ color, art, className }: { color: string; art?: Art | string; className?: string }) {
  const ink = isLight(color) ? "#1a1a1a" : "#efe9df";
  const id = color.replace("#", "");
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <defs>
        <linearGradient id={`shade-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".18" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`light-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".08" />
        </linearGradient>
        <radialGradient id={`floor-${id}`}>
          <stop offset="0" stopColor="#000" stopOpacity=".18" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="356" rx="120" ry="10" fill={`url(#floor-${id})`} />
      <g>
        <path
          id={`tee-${id}`}
          d="M162 62 C175 78 225 78 238 62 L300 84 C318 92 340 122 352 150 L316 170 C310 160 304 152 296 146 L300 334 C300 340 296 344 290 344 L110 344 C104 344 100 340 100 334 L104 146 C96 152 90 160 84 170 L48 150 C60 122 82 92 100 84 Z"
          fill={color}
          stroke="var(--tee-rim)"
          strokeWidth="1.5"
        />
        <path d="M162 62 C175 78 225 78 238 62 L300 84 C318 92 340 122 352 150 L316 170 C310 160 304 152 296 146 L300 334 C300 340 296 344 290 344 L110 344 C104 344 100 340 100 334 L104 146 C96 152 90 160 84 170 L48 150 C60 122 82 92 100 84 Z" fill={`url(#shade-${id})`} />
        <path d="M162 62 C175 78 225 78 238 62 L300 84 C318 92 340 122 352 150 L316 170 C310 160 304 152 296 146 L300 334 C300 340 296 344 290 344 L110 344 C104 344 100 340 100 334 L104 146 C96 152 90 160 84 170 L48 150 C60 122 82 92 100 84 Z" fill={`url(#light-${id})`} />
        {/* collar rib + soft folds */}
        <path d="M162 62 C175 82 225 82 238 62" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth="5" />
        <path d="M130 190 C150 250 140 300 150 340" fill="none" stroke="#000" strokeOpacity=".035" strokeWidth="26" strokeLinecap="round" />
        <path d="M270 180 C250 240 262 296 252 340" fill="none" stroke="#fff" strokeOpacity=".05" strokeWidth="30" strokeLinecap="round" />
      </g>
      <Print art={art} ink={ink} />
    </svg>
  );
}

/** Product visual: the product's photo when it has one (uploaded from the admin), else sand backdrop + tee. */
export function ProductImage({ color, art, bg = "var(--sand)", className = "", zoom = true, photo, alt = "" }: { color: string; art?: Art | string; bg?: string; className?: string; zoom?: boolean; photo?: string; alt?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: bg }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos live on R2, whose public domain is set per deployment
        <img src={photo} alt={alt} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover ${zoom ? "zoom-img" : ""}`} />
      ) : (
        <TeeIllustration color={color} art={art} className={`absolute inset-[8%] h-[84%] w-[84%] ${zoom ? "zoom-img" : ""}`} />
      )}
    </div>
  );
}
