"use client";

import { useEffect, useRef, useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { DEFAULT_TSHIRT_COLOR } from "./colors";
import {
  DEFAULT_PLACEMENT,
  DESIGN_FILE_RULES,
  MAX_DESIGN_LAYERS,
  type DesignLayer,
  type DesignPlacement,
} from "./design";
import { DesignControls } from "./DesignControls";
import { DesignLayers } from "./DesignLayers";
import { DesignUpload, type UploadedDesign } from "./DesignUpload";
import { TshirtViewer } from "./TshirtViewer";

/**
 * Configurateur : couleur du t-shirt + images du client placées sur le modèle 3D.
 * Pour l'instant, les images restent dans le navigateur. L'envoi vers le stockage
 * et l'enregistrement dans la commande viendront avec le panier.
 */
export function TshirtStudio() {
  const [color, setColor] = useState<string>(DEFAULT_TSHIRT_COLOR);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  // Libère la mémoire de toutes les images quand le client quitte la page.
  const layersRef = useRef(layers);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  useEffect(() => () => layersRef.current.forEach((l) => URL.revokeObjectURL(l.url)), []);

  function addLayers(uploads: UploadedDesign[]) {
    // Chaque nouvelle image est légèrement décalée pour ne pas cacher la précédente.
    const added: DesignLayer[] = uploads.map((u, i) => ({
      id: crypto.randomUUID(),
      ...u,
      placement: {
        ...DEFAULT_PLACEMENT,
        side: selected?.placement.side ?? DEFAULT_PLACEMENT.side,
        y: DEFAULT_PLACEMENT.y - ((layers.length + i) % 4) * 3,
      },
    }));
    setLayers((prev) => [...prev, ...added]);
    setSelectedId(added[added.length - 1]?.id ?? null);
  }

  function updatePlacement(id: string, placement: DesignPlacement) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, placement } : l)));
  }

  function removeLayer(id: string) {
    const layer = layers.find((l) => l.id === id);
    if (layer) URL.revokeObjectURL(layer.url);
    const rest = layers.filter((l) => l.id !== id);
    setLayers(rest);
    if (selectedId === id) setSelectedId(rest[rest.length - 1]?.id ?? null);
  }

  function moveLayer(id: string, direction: -1 | 1) {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  return (
    <section className="flex w-full flex-col items-center gap-6">
      <TshirtViewer
        color={color}
        designs={layers.map(({ id, url, placement }) => ({ id, url, placement }))}
        focusSide={selected?.placement.side}
        className="h-[60vh] min-h-80 w-full max-w-2xl"
      />

      {layers.length > 0 && (
        <DesignLayers
          layers={layers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={removeLayer}
          onMove={moveLayer}
        />
      )}

      {selected && (
        <DesignControls
          lowResolution={selected.width < DESIGN_FILE_RULES.recommendedMinWidth}
          placement={selected.placement}
          onChange={(p) => updatePlacement(selected.id, p)}
        />
      )}

      <DesignUpload
        remaining={MAX_DESIGN_LAYERS - layers.length}
        compact={layers.length > 0}
        onUpload={addLayers}
      />

      <ColorPicker value={color} onChange={setColor} />
    </section>
  );
}
