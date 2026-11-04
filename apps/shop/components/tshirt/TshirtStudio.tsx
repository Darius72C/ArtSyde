"use client";

import { useEffect, useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { DEFAULT_TSHIRT_COLOR } from "./colors";
import { DEFAULT_PLACEMENT, DESIGN_FILE_RULES, type DesignPlacement } from "./design";
import { DesignControls } from "./DesignControls";
import { DesignUpload, type UploadedDesign } from "./DesignUpload";
import { TshirtViewer } from "./TshirtViewer";

/**
 * Configurateur : couleur du t-shirt + design du client placé sur le modèle 3D.
 * Pour l'instant, l'image reste dans le navigateur. L'envoi vers le stockage
 * et l'enregistrement dans la commande viendront avec le panier.
 */
export function TshirtStudio() {
  const [color, setColor] = useState<string>(DEFAULT_TSHIRT_COLOR);
  const [design, setDesign] = useState<UploadedDesign | null>(null);
  const [placement, setPlacement] = useState<DesignPlacement>(DEFAULT_PLACEMENT);

  // Libère la mémoire de l'image précédente quand elle est remplacée ou retirée.
  useEffect(() => {
    if (!design) return;
    return () => URL.revokeObjectURL(design.url);
  }, [design]);

  return (
    <section className="flex w-full flex-col items-center gap-6">
      <TshirtViewer
        color={color}
        design={design ? { url: design.url, placement } : null}
        className="h-[60vh] min-h-80 w-full max-w-2xl"
      />

      {design ? (
        <DesignControls
          fileName={design.file.name}
          lowResolution={design.width < DESIGN_FILE_RULES.recommendedMinWidth}
          placement={placement}
          onChange={setPlacement}
          onRemove={() => setDesign(null)}
        />
      ) : (
        <DesignUpload
          onUpload={(d) => {
            setDesign(d);
            setPlacement(DEFAULT_PLACEMENT);
          }}
        />
      )}

      <ColorPicker value={color} onChange={setColor} />
    </section>
  );
}
