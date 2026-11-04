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
  /** Nombre d'images que le client peut encore ajouter. */
  remaining: number;
  /** Version compacte, affichée quand le t-shirt a déjà des images. */
  compact?: boolean;
  onUpload: (designs: UploadedDesign[]) => void;
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

/** Zone d'envoi des images : clic ou glisser-déposer, plusieurs fichiers à la fois. */
export function DesignUpload({ remaining, compact = false, onUpload }: DesignUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(list: FileList | null | undefined) {
    if (!list || list.length === 0) return;
    const problems: string[] = [];
    let files = Array.from(list);

    if (files.length > remaining) {
      problems.push(
        `Tu peux encore ajouter ${remaining} image${remaining > 1 ? "s" : ""}. Les suivantes ont été ignorées.`,
      );
      files = files.slice(0, remaining);
    }

    const accepted: UploadedDesign[] = [];
    for (const file of files) {
      if (!(DESIGN_FILE_RULES.types as readonly string[]).includes(file.type)) {
        problems.push(`« ${file.name} » : format non accepté (PNG, JPG ou WebP).`);
        continue;
      }
      if (file.size > DESIGN_FILE_RULES.maxBytes) {
        problems.push(`« ${file.name} » : trop lourde (15 Mo maximum).`);
        continue;
      }
      const url = URL.createObjectURL(file);
      try {
        accepted.push({ file, url, ...(await readImageSize(url)) });
      } catch {
        URL.revokeObjectURL(url);
        problems.push(`« ${file.name} » : impossible de lire cette image.`);
      }
    }

    setErrors(problems);
    if (accepted.length > 0) onUpload(accepted);
  }

  const disabled = remaining <= 0;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <button
        type="button"
        onClick={() => !disabled && input.current?.click()}
        aria-disabled={disabled}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) void handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 transition ${
          compact ? "py-3" : "py-6"
        } ${
          disabled
            ? "cursor-not-allowed border-ash-gray opacity-50"
            : dragging
              ? "border-curse-violet bg-curse-violet/10"
              : "border-ash-gray hover:border-curse-violet"
        }`}
      >
        <span className="font-medium">
          {disabled
            ? "Nombre maximum d'images atteint"
            : compact
              ? "+ Ajouter d'autres images"
              : "Ajoute tes propres designs"}
        </span>
        {!compact && (
          <span className="text-sm text-ghost-white/60">
            Clique ou glisse une ou plusieurs images ici. PNG, JPG ou WebP, 15 Mo maximum chacune.
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={DESIGN_FILE_RULES.accept}
        className="sr-only"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {errors.length > 0 && (
        <ul role="alert" className="text-left text-sm text-red-400">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
