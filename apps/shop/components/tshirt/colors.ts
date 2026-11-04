/** Couleurs de t-shirt proposées. La texture du modèle est blanche, donc
 *  la couleur du matériau est appliquée telle quelle sur le tissu. */
export const TSHIRT_COLORS = [
  { id: "noir", label: "Noir", hex: "#1C1B20" },
  { id: "blanc", label: "Blanc", hex: "#F2F0EC" },
  { id: "gris", label: "Gris chiné", hex: "#8A8890" },
  { id: "violet", label: "Violet maudit", hex: "#8B3DFF" },
  { id: "bordeaux", label: "Bordeaux", hex: "#6B1E2E" },
] as const;

export type TshirtColor = (typeof TSHIRT_COLORS)[number];
