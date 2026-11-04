"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
import { TSHIRT_COLORS } from "./colors";

type ColorPickerProps = {
  /** Couleur actuelle en hexadécimal, ex. "#8B3DFF". */
  value: string;
  onChange: (hex: string) => void;
};

/**
 * Choix de couleur : des pastilles pour les couleurs populaires, plus une
 * palette complète (carré de nuances + barre de teintes) et un champ hexadécimal.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const preset = TSHIRT_COLORS.find((c) => c.hex.toLowerCase() === value.toLowerCase());

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-5">
      <fieldset className="flex flex-col items-center gap-3">
        <legend className="mb-3 text-sm text-ghost-white/70">
          Couleur : <span className="text-ghost-white">{preset?.label ?? "Personnalisée"}</span>
        </legend>
        <div className="flex gap-3">
          {TSHIRT_COLORS.map((c) => {
            const selected = c.id === preset?.id;
            return (
              <label key={c.id} className="cursor-pointer" title={c.label}>
                <input
                  type="radio"
                  name="tshirt-color"
                  value={c.id}
                  checked={selected}
                  onChange={() => onChange(c.hex)}
                  className="peer sr-only"
                />
                <span
                  className={`block size-9 rounded-full border border-ash-gray transition peer-focus-visible:ring-2 peer-focus-visible:ring-curse-violet ${
                    selected ? "ring-2 ring-curse-violet ring-offset-2 ring-offset-curse-black" : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
                <span className="sr-only">{c.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="artsyde-picker w-full">
        <HexColorPicker color={value} onChange={onChange} />
      </div>

      <label className="flex items-center gap-3 text-sm text-ghost-white/70">
        Code couleur
        <span className="flex items-center rounded-md border border-ash-gray px-3 py-2 focus-within:border-curse-violet">
          <span className="text-ghost-white/50">#</span>
          <HexColorInput
            color={value}
            onChange={onChange}
            className="w-20 bg-transparent uppercase text-ghost-white outline-none"
            aria-label="Code couleur hexadécimal"
          />
        </span>
        <span
          className="size-8 rounded-md border border-ash-gray"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
      </label>
    </div>
  );
}
