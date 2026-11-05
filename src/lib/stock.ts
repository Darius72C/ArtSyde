/**
 * Stock of blank t-shirts as the shop sees it: quantity left by colour (lower-case hex) and size.
 * Shared by the server (checkout check) and the browser (sold-out sizes, studio).
 *
 * A colour with no stock line is not tracked and counts as available: the shop keeps working while the
 * stock is being set up. Once a colour has lines, a size without a line or at 0 is sold out.
 */
export type StockMap = Record<string, Record<string, number>>;

/** How many t-shirts of this colour and size can still be sold (Infinity when the colour is not tracked). */
export function available(stock: StockMap | undefined, hex: string, size: string): number {
  const colour = stock?.[hex.toLowerCase()];
  if (!colour) return Infinity;
  return Math.max(0, colour[size] ?? 0);
}

/** Whether the colour is tracked in the stock at all. */
export const tracked = (stock: StockMap | undefined, hex: string) => Boolean(stock?.[hex.toLowerCase()]);

/** The size to pick by default: M if it's in stock, else the first size in stock, else M. */
export function defaultSize(stock: StockMap | undefined, hex: string, sizes: string[]) {
  const ok = sizes.filter((s) => available(stock, hex, s) > 0);
  return ok.includes("M") ? "M" : (ok[0] ?? (sizes.includes("M") ? "M" : (sizes[0] ?? "M")));
}
