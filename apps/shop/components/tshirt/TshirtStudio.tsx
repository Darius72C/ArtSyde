"use client";

import { useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { TSHIRT_COLORS, type TshirtColor } from "./colors";
import { TshirtViewer } from "./TshirtViewer";

/** Visionneuse 3D + choix de la couleur. Servira de base au configurateur. */
export function TshirtStudio() {
  const [colorId, setColorId] = useState<TshirtColor["id"]>("noir");
  const color = TSHIRT_COLORS.find((c) => c.id === colorId) ?? TSHIRT_COLORS[0];

  return (
    <section className="flex w-full flex-col items-center gap-6">
      <TshirtViewer color={color.hex} className="h-[60vh] min-h-80 w-full max-w-2xl" />
      <ColorPicker value={colorId} onChange={setColorId} />
    </section>
  );
}
