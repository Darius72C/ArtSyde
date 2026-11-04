"use client";

import { useRef, useState } from "react";
import { DESIGN_FILE_RULES } from "./design";

export type UploadedDesign = {
  file: File;
  url: string;
  width: number;
  height: number;
};

type DesignUploadProps = {
  onUpload: (design: UploadedDesign) => void;
};

/** Lit la taille réelle de l'image pour vérifier sa qualité d'impression. */
function readImageSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("unreadable"));
    img.src = url;
  });
}

/** Zone d'envoi du design : clic ou glisser-déposer. */
export function DesignUpload({ onUpload }: DesignUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;

    if (!(DESIGN_FILE_RULES.types as readonly string[]).includes(file.type)) {
      setError("Format non accepté. Envoie une image PNG, JPG ou WebP.");
      return;
    }
    if (file.size > DESIGN_FILE_RULES.maxBytes) {
      setError("Image trop lourde. La taille maximale est de 15 Mo.");
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const size = await readImageSize(url);
      onUpload({ file, url, ...size });
    } catch {
      URL.revokeObjectURL(url);
      setError("Impossible de lire cette image. Essaie avec un autre fichier.");
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 transition ${
          dragging
            ? "border-curse-violet bg-curse-violet/10"
            : "border-ash-gray hover:border-curse-violet"
        }`}
      >
        <span className="font-medium">Ajoute ton propre design</span>
        <span className="text-sm text-ghost-white/60">
          Clique ou glisse ton image ici. PNG, JPG ou WebP, 15 Mo maximum.
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={DESIGN_FILE_RULES.accept}
        className="sr-only"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
