/**
 * The shop's identity and the facts its information and legal pages print (contact, legal notice, terms).
 * Fill in every value marked TODO before going online: they show as "à compléter" on the site until then.
 */

const TODO = "à compléter";

export const COMPANY = {
  /** Trading name, as on the site. */
  brand: "ArtSyde",
  /** Legal name and form, e.g. "ArtSyde SARL" or the owner's name for a sole trader. */
  legalName: TODO,
  /** Registration number at the RCCM, e.g. "CI-ABJ-2026-B-12345". */
  rccm: TODO,
  /** Tax number (NCC / compte contribuable). */
  taxId: TODO,
  /** Workshop address: where pickup orders are collected. */
  address: TODO,
  city: "Abidjan",
  country: "Côte d'Ivoire",
  email: TODO,
  phone: TODO,
  /** WhatsApp number in international format without + or spaces (e.g. 2250700000000), or "" for none. */
  whatsapp: "",
  /** Opening hours of the workshop for pickup. */
  hours: TODO,
  /** Person responsible for the site's content (directeur de la publication). */
  publisher: TODO,
  /** Where the site is hosted (e.g. "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis"). */
  host: TODO,
} as const;

/** True once a value has been filled in. */
export const filled = (v: string) => Boolean(v) && v !== TODO;

/**
 * Size guide of the oversized tee, in centimetres, measured flat: width from armpit to armpit, length from
 * the top of the shoulder to the hem. TODO: replace with the workshop's real measurements.
 */
export const SIZE_GUIDE: { size: string; chest: number; length: number; sleeve: number }[] = [
  { size: "XS", chest: 54, length: 68, sleeve: 21 },
  { size: "S", chest: 56, length: 70, sleeve: 22 },
  { size: "M", chest: 58, length: 72, sleeve: 23 },
  { size: "L", chest: 61, length: 74, sleeve: 24 },
  { size: "XL", chest: 64, length: 76, sleeve: 25 },
  { size: "XXL", chest: 67, length: 78, sleeve: 26 },
];
/** Whether SIZE_GUIDE holds the workshop's real measurements (set to true once replaced). */
export const SIZE_GUIDE_CONFIRMED = false;

/** Date shown under the legal pages ("Dernière mise à jour"). Change it when a text changes. */
export const LEGAL_UPDATED = "5 novembre 2026";
