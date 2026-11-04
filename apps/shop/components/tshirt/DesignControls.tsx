"use client";

import { DEFAULT_PLACEMENT, PRINT_AREA, type DesignPlacement, type DesignSide } from "./design";

type DesignControlsProps = {
  lowResolution: boolean;
  placement: DesignPlacement;
  onChange: (placement: DesignPlacement) => void;
};

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

function Slider({ label, value, min, max, step = 0.5, unit = "", onChange }: SliderProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between text-ghost-white/70">
        {label}
        <span className="tabular-nums text-ghost-white">
          {Math.round(value * 10) / 10}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-curse-violet"
      />
    </label>
  );
}

const SIDES: { id: DesignSide; label: string }[] = [
  { id: "front", label: "Devant" },
  { id: "back", label: "Dos" },
];

/** Réglages de l'image sélectionnée : face, position, taille et rotation. */
export function DesignControls({ lowResolution, placement, onChange }: DesignControlsProps) {
  const set = (patch: Partial<DesignPlacement>) => onChange({ ...placement, ...patch });

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-ash-gray p-5 text-left">
      {lowResolution && (
        <p className="rounded-md bg-yellow-400/10 px-3 py-2 text-sm text-yellow-200">
          Ton image est petite : elle risque d&apos;être floue à l&apos;impression. Si tu en as une
          version plus grande (au moins 1500 pixels de large), utilise-la.
        </p>
      )}

      <div role="radiogroup" aria-label="Face du t-shirt" className="grid grid-cols-2 gap-2">
        {SIDES.map((s) => {
          const active = placement.side === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set({ side: s.id })}
              className={`rounded-md border px-3 py-2 text-sm transition ${
                active
                  ? "border-curse-violet bg-curse-violet text-ghost-white"
                  : "border-ash-gray hover:border-curse-violet"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Slider
          label="Gauche / droite"
          value={placement.x}
          min={PRINT_AREA.x.min}
          max={PRINT_AREA.x.max}
          onChange={(x) => set({ x })}
        />
        <Slider
          label="Hauteur"
          value={placement.y}
          min={PRINT_AREA.y.min}
          max={PRINT_AREA.y.max}
          onChange={(y) => set({ y })}
        />
        <Slider
          label="Taille"
          value={placement.width}
          min={PRINT_AREA.width.min}
          max={PRINT_AREA.width.max}
          onChange={(width) => set({ width })}
        />
        <Slider
          label="Rotation"
          value={placement.rotation}
          min={PRINT_AREA.rotation.min}
          max={PRINT_AREA.rotation.max}
          step={1}
          unit="°"
          onChange={(rotation) => set({ rotation })}
        />
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_PLACEMENT, side: placement.side })}
        className="self-start text-sm text-ghost-white/60 underline hover:text-curse-violet"
      >
        Recentrer cette image
      </button>
    </div>
  );
}
