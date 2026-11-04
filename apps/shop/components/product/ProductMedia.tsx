"use client";

import { useState } from "react";
import Image from "next/image";
import { PRODUCT_PLACEMENT } from "@/components/tshirt/design";
import { TshirtViewer } from "@/components/tshirt/TshirtViewer";

export type MediaMode = "photos" | "3d";

type ProductMediaProps = {
  name: string;
  productId: string;
  designUrl: string;
  mockups: string[];
  color: string;
  mode: MediaMode;
  onModeChange: (mode: MediaMode) => void;
};

const MODES: { id: MediaMode; label: string }[] = [
  { id: "photos", label: "Photos" },
  { id: "3d", label: "3D" },
];

/**
 * Visuel de la fiche produit : les photos (mockups) ou le t-shirt 3D interactif.
 * Sans mockup, seule la vue 3D est proposée.
 */
export function ProductMedia({
  name,
  productId,
  designUrl,
  mockups,
  color,
  mode,
  onModeChange,
}: ProductMediaProps) {
  const [active, setActive] = useState(0);
  const hasPhotos = mockups.length > 0;
  const current = hasPhotos && mode === "photos" ? "photos" : "3d";
  const photo = mockups[Math.min(active, mockups.length - 1)];

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
      <div className="relative h-[55vh] min-h-80 w-full overflow-hidden rounded-xl border border-ash-gray">
        {current === "photos" && photo ? (
          <Image
            src={photo}
            alt={`${name}, photo ${active + 1} sur ${mockups.length}`}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <TshirtViewer
            color={color}
            designs={[{ id: productId, url: designUrl, placement: PRODUCT_PLACEMENT }]}
            className="h-full w-full"
          />
        )}

        {hasPhotos && (
          <div
            role="tablist"
            aria-label="Type d'aperçu"
            className="absolute left-3 top-3 flex rounded-md border border-ash-gray bg-curse-black/80 p-1 backdrop-blur"
          >
            {MODES.map((m) => {
              const selected = current === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onModeChange(m.id)}
                  className={`rounded px-3 py-1 text-sm transition ${
                    selected ? "bg-curse-violet text-ghost-white" : "text-ghost-white/70 hover:text-ghost-white"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Miniatures, quand il y a plusieurs photos. */}
      {current === "photos" && mockups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" aria-label="Photos du produit">
          {mockups.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === active}
              className={`relative size-16 shrink-0 overflow-hidden rounded-md border transition ${
                i === active ? "border-curse-violet" : "border-ash-gray hover:border-curse-violet"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
