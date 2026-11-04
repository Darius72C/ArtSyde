/**
 * Palette de couleurs de t-shirt proposées aux clients (reprise du nuancier de référence).
 * Pour retirer une couleur que le fournisseur ne peut pas produire, supprime-la de cette liste.
 * Plus tard, cette liste sera gérée depuis l'app de monitoring.
 */
export const TSHIRT_PALETTE = [
  "#000000", "#FFFFFF", "#E8E8E8", "#BABABA", "#989898", "#696969", "#606060", "#3A3A3A",
  "#B5475C", "#D36371", "#F27981", "#FEA6A9", "#F9B2B7", "#FFC3C2", "#FFCECC", "#FFE6E3",
  "#A50024", "#C70F28", "#ED1C24", "#E64B3A", "#FFA397", "#EF7467", "#F37977", "#F69D91",
  "#CC5D54", "#B34436", "#9E4D49", "#6B2D2D", "#FFB18A", "#F7C194", "#FFCCA8", "#FFD7B3",
  "#EFC3AF", "#FFDECC", "#FFE9E2", "#FFEDD4", "#FFD39F", "#FFC571", "#F0BA60", "#FFA851",
  "#FA9044", "#F5873F", "#EA680F", "#F26522", "#F7572D", "#C93127", "#BB5727", "#8C4017",
  "#603913", "#9E5920", "#BF854B", "#E09A58", "#D07F2B", "#DD9D26", "#E2B56C", "#DEC48F",
  "#EAD6BB", "#F7F1D9", "#FDF7BD", "#FFF2B3", "#FFE98F", "#FFC829", "#FFE94D", "#F5F27B",
  "#ECE953", "#E5E43B", "#D2B648", "#C2CE6B", "#E9EFBC", "#E6F9DB", "#CCE251", "#74A952",
  "#A1C75B", "#54753F", "#465A3E", "#253A21", "#6FC75C", "#74B87E", "#48A05B", "#279143",
  "#006838", "#004924", "#66BC46", "#ECFDE9", "#CFEFCA", "#D1F3E4", "#C2E4D5", "#97D3B8",
  "#007258", "#00452D", "#91BA96", "#789472", "#7E8D68", "#7B8260", "#565B39", "#393500",
  "#248971", "#31A28E", "#00BEB8", "#43CAC9", "#4BB7BC", "#008B97", "#00505A", "#063140",
  "#BFD8C6", "#A9C4BA", "#70898D", "#284860", "#006993", "#1A85AC", "#3399B5", "#3DB7D3",
  "#D0F6F6", "#A2E5F4", "#99DCF3", "#43B3D4", "#34B6EF", "#037CC7", "#6EA5D9", "#C1D9F7",
  "#C5DDF3", "#0E3D84", "#4460A7", "#506B93", "#364B6A", "#0F1E3C", "#C6C1E4", "#B3B9DD",
  "#8091BE", "#7275B2", "#7D78C0", "#6D75BE", "#5C58AF", "#494570", "#23133D", "#46276B",
  "#512A7E", "#8A6AA7", "#B195C2", "#D3C5E8", "#DDC7D3", "#E9BDD5", "#F8DDF3", "#EE96C9",
  "#D072A6", "#C52D89", "#A82981", "#84175E", "#70265D", "#571147", "#CD368C", "#E0007B",
  "#FF8AAB", "#F768A0", "#A52F59", "#93003C", "#7C1123", "#512D32", "#8C6262", "#B09C9D",
  "#B6A9B2", "#EED0DA", "#FFE1E3", "#FFD5DB", "#FFCAD0", "#EFB1C0", "#E2AABA", "#B17D8C",
  "#C15860", "#CF4952", "#D3002E", "#F63C5A", "#F55886", "#FFB6CE", "#FFDCE9",
] as const;

export const DEFAULT_TSHIRT_COLOR = "#000000";
