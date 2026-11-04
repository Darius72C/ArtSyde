"use client";

import { useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { DEFAULT_TSHIRT_COLOR } from "./colors";
import { TshirtViewer } from "./TshirtViewer";

/** Visionneuse 3D + choix de la couleur. Servira de base au configurateur. */
export function TshirtStudio() {
  const [color, setColor] = useState<string>(DEFAULT_TSHIRT_COLOR);

  return (
    <section className="flex w-full flex-col items-center gap-6">
      <TshirtViewer color={color} className="h-[60vh] min-h-80 w-full max-w-2xl" />
      <ColorPicker value={color} onChange={setColor} />
    </section>
  );
}
