const xof = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Formate un prix en francs CFA, ex. 12000 → « 12 000 FCFA ». */
export function formatXof(amount: number) {
  return `${xof.format(amount)} FCFA`;
}
