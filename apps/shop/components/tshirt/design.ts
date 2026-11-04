/*
 * Placement d'un design client sur le t-shirt 3D.
 * Les unités sont celles du modèle (environ des centimètres) : le t-shirt fait
 * ~39 de haut, le torse ~20 de large. Ce même objet est enregistré dans la
 * colonne `placement` de CustomDesign, pour que tu saches où imprimer.
 */

export type DesignSide = "front" | "back";

export type DesignPlacement = {
  side: DesignSide;
  /** Décalage horizontal depuis le centre (négatif = gauche, vu de face). */
  x: number;
  /** Hauteur depuis le bas du t-shirt. */
  y: number;
  /** Largeur du design. La hauteur suit les proportions de l'image. */
  width: number;
  /** Rotation en degrés. */
  rotation: number;
};

/** Zone imprimable : on empêche le design de sortir du torse. */
export const PRINT_AREA = {
  x: { min: -7, max: 7 },
  y: { min: 8, max: 32 },
  width: { min: 3, max: 18 },
  rotation: { min: -45, max: 45 },
} as const;

export const DEFAULT_PLACEMENT: DesignPlacement = {
  side: "front",
  x: 0,
  y: 24,
  width: 11,
  rotation: 0,
};

/** Fichiers acceptés pour un design client. */
export const DESIGN_FILE_RULES = {
  types: ["image/png", "image/jpeg", "image/webp"],
  accept: ".png,.jpg,.jpeg,.webp",
  maxBytes: 15 * 1024 * 1024,
  /** En dessous de cette largeur, l'impression risque d'être floue. */
  recommendedMinWidth: 1500,
} as const;

/** Nombre maximum d'images sur un même t-shirt. */
export const MAX_DESIGN_LAYERS = 10;

/** Une image du client posée sur le t-shirt (un « calque »). */
export type DesignLayer = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  placement: DesignPlacement;
};

/** Position du design des modèles du catalogue : centré sur la poitrine. */
export const PRODUCT_PLACEMENT: DesignPlacement = {
  side: "front",
  x: 0,
  y: 23,
  width: 13,
  rotation: 0,
};
