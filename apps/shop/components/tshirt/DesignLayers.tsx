"use client";

import type { DesignLayer } from "./design";

type DesignLayersProps = {
  layers: DesignLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
};

const SIDE_LABEL = { front: "Devant", back: "Dos" } as const;

/**
 * Liste des images posées sur le t-shirt. La dernière de la liste est
 * au-dessus des autres quand elles se chevauchent.
 */
export function DesignLayers({ layers, selectedId, onSelect, onRemove, onMove }: DesignLayersProps) {
  // Affichée du calque du dessus vers celui du dessous, comme dans un logiciel de dessin.
  const ordered = [...layers].reverse();

  return (
    <ul className="flex w-full max-w-2xl flex-col gap-2" aria-label="Images sur le t-shirt">
      {ordered.map((layer) => {
        const index = layers.indexOf(layer);
        const selected = layer.id === selectedId;
        return (
          <li
            key={layer.id}
            className={`flex items-center gap-3 rounded-xl border p-2 text-left transition ${
              selected ? "border-curse-violet bg-curse-violet/10" : "border-ash-gray"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(layer.id)}
              aria-pressed={selected}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
              <img
                src={layer.url}
                alt=""
                className="size-12 shrink-0 rounded-md bg-white/5 object-contain"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{layer.file.name}</span>
                <span className="text-xs text-ghost-white/60">{SIDE_LABEL[layer.placement.side]}</span>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1 text-ghost-white/70">
              <button
                type="button"
                onClick={() => onMove(layer.id, 1)}
                disabled={index === layers.length - 1}
                className="rounded px-2 py-1 hover:text-curse-violet disabled:opacity-30"
                aria-label="Passer au-dessus"
                title="Passer au-dessus"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMove(layer.id, -1)}
                disabled={index === 0}
                className="rounded px-2 py-1 hover:text-curse-violet disabled:opacity-30"
                aria-label="Passer en dessous"
                title="Passer en dessous"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onRemove(layer.id)}
                className="rounded px-2 py-1 hover:text-red-400"
                aria-label={`Retirer ${layer.file.name}`}
                title="Retirer"
              >
                ✕
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
