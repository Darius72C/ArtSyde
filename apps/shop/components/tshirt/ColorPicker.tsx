"use client";

import { TSHIRT_COLORS, type TshirtColor } from "./colors";

type ColorPickerProps = {
  value: TshirtColor["id"];
  onChange: (id: TshirtColor["id"]) => void;
};

/** Pastilles de couleur. Chaque pastille est un bouton radio accessible. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const current = TSHIRT_COLORS.find((c) => c.id === value);

  return (
    <fieldset className="flex flex-col items-center gap-3">
      <legend className="mb-3 text-sm text-ghost-white/70">
        Couleur : <span className="text-ghost-white">{current?.label}</span>
      </legend>
      <div className="flex gap-3">
        {TSHIRT_COLORS.map((c) => {
          const selected = c.id === value;
          return (
            <label key={c.id} className="cursor-pointer" title={c.label}>
              <input
                type="radio"
                name="tshirt-color"
                value={c.id}
                checked={selected}
                onChange={() => onChange(c.id)}
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
  );
}
