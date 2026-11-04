"use client";

import { TSHIRT_PALETTE } from "./colors";

type ColorPickerProps = {
  /** Couleur actuelle en hexadécimal, ex. "#8B3DFF". */
  value: string;
  onChange: (hex: string) => void;
  /** Couleurs proposées. Par défaut, tout le nuancier. */
  palette?: readonly string[];
  /** Affiche la pastille arc-en-ciel pour une couleur libre. */
  allowCustom?: boolean;
};

/** Vrai si la couleur est claire : la coche est alors dessinée en noir. */
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

function Check({ light }: { light: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke={light ? "#0E0B14" : "#FFFFFF"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const swatch =
  "relative flex aspect-square items-center justify-center rounded-md border border-black/10 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-curse-violet";

/** Nuancier : une grille de pastilles carrées, plus une pastille « couleur libre ». */
export function ColorPicker({
  value,
  onChange,
  palette = TSHIRT_PALETTE,
  allowCustom = true,
}: ColorPickerProps) {
  const current = value.toUpperCase();
  const colors = palette.map((c) => c.toUpperCase());
  const inPalette = colors.includes(current);
  // Peu de couleurs (fiche produit) : grille compacte au lieu du grand nuancier.
  const small = colors.length <= 8;

  return (
    <div
      role="radiogroup"
      aria-label="Couleur du t-shirt"
      className={
        small
          ? "flex flex-wrap gap-2"
          : "grid w-full max-w-2xl grid-cols-8 gap-1.5 rounded-xl bg-white p-2 sm:grid-cols-16"
      }
    >
      {/* Couleur libre : ouvre le sélecteur de couleur du système. */}
      {allowCustom && (
      <label
        className={`${swatch} ${small ? "size-10" : "w-full"} cursor-pointer ${!inPalette ? "ring-2 ring-[#3A3346]" : ""}`}
        style={{
          background:
            "conic-gradient(from 180deg, #ff3b3b, #ffd93b, #3bff6b, #3bd8ff, #6b3bff, #ff3bd8, #ff3b3b)",
        }}
        title="Couleur personnalisée"
      >
        <input
          type="color"
          value={current.toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Choisir une couleur personnalisée"
        />
        {!inPalette && <Check light={false} />}
      </label>
      )}

      {colors.map((hex) => {
        const selected = hex === current;
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={hex}
            title={hex}
            onClick={() => onChange(hex)}
            className={`${swatch} ${small ? "size-10 border-white/20" : "w-full"} ${
              selected
                ? small
                  ? "ring-2 ring-curse-violet ring-offset-2 ring-offset-curse-black"
                  : "ring-2 ring-[#3A3346] ring-offset-1"
                : ""
            }`}
            style={{ backgroundColor: hex }}
          >
            {selected && <Check light={isLight(hex)} />}
          </button>
        );
      })}
    </div>
  );
}
