"use client";

import { useState } from "react";
import type { Size } from "@artsyde/db";
import { ColorPicker } from "@/components/tshirt/ColorPicker";
import type { DesignPlacement } from "@/components/tshirt/design";
import { TshirtViewer } from "@/components/tshirt/TshirtViewer";
import { formatXof } from "@/lib/format";

/** Position du design des modèles du catalogue : centré sur la poitrine. */
const PRODUCT_PLACEMENT: DesignPlacement = { side: "front", x: 0, y: 23, width: 13, rotation: 0 };

type ProductConfiguratorProps = {
  product: {
    id: string;
    name: string;
    description: string;
    priceXof: number;
    designUrl: string;
    colors: string[];
    sizes: Size[];
  };
};

/** Fiche produit interactive : t-shirt 3D, couleur, taille et prix. */
export function ProductConfigurator({ product }: ProductConfiguratorProps) {
  const [color, setColor] = useState(product.colors[0] ?? "#000000");
  const [size, setSize] = useState<Size | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function addToCart() {
    if (!size) {
      setMessage("Choisis d'abord ta taille.");
      return;
    }
    // Le panier sera branché à l'étape suivante.
    setMessage("Le panier arrive très bientôt !");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <TshirtViewer
        color={color}
        designs={[{ id: product.id, url: product.designUrl, placement: PRODUCT_PLACEMENT }]}
        className="h-[55vh] min-h-80 w-full rounded-xl border border-ash-gray lg:sticky lg:top-20"
      />

      <div className="flex flex-col gap-6 text-left">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl">{product.name}</h1>
          <p className="text-2xl text-curse-violet">{formatXof(product.priceXof)}</p>
        </div>

        <p className="text-ghost-white/80">{product.description}</p>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-ghost-white/70">Couleur</p>
          <ColorPicker
            value={color}
            onChange={setColor}
            palette={product.colors}
            allowCustom={false}
          />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-ghost-white/70">Taille</p>
          <div role="radiogroup" aria-label="Taille" className="flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const active = s === size;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setSize(s);
                    setMessage(null);
                  }}
                  className={`min-w-12 rounded-md border px-3 py-2 text-sm transition ${
                    active
                      ? "border-curse-violet bg-curse-violet text-ghost-white"
                      : "border-ash-gray hover:border-curse-violet"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={addToCart}
            className="rounded-md bg-curse-violet px-5 py-3 font-medium text-ghost-white transition hover:brightness-110"
          >
            Ajouter au panier
          </button>
          {message && (
            <p role="status" className="text-sm text-ghost-white/70">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
