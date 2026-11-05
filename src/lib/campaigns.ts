/**
 * The ready-made e-mails sent to newsletter subscribers from Admin > E-mails: a newsletter (the latest
 * t-shirts), a promotion (a discount and its code) and an announcement. Each one's words are saved as a draft
 * (SiteSetting "email.<kind>") and can be sent again later. {prenom} becomes the subscriber's first name
 * (or disappears when we don't know it).
 */

export type CampaignKind = "newsletter" | "promo" | "annonce";

export type CampaignTexts = {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  /** The opening photo (R2, uploaded in the editor); empty: the home page's first card. */
  image: string;
  body: string;
  button: string;
  /** Where the button leads: a page of the site (/studio…) or another site (https://…). */
  url: string;
  /** Promotion only. */
  discount: string;
  discountText: string;
  code: string;
  until: string;
  /** Newsletter only: the title over the latest t-shirts, and how many (0: none). */
  productsTitle: string;
  products: string;
};

export type CampaignField = { key: keyof CampaignTexts; label: string; long?: boolean; max: number; hint?: string };

export const CAMPAIGNS: Record<CampaignKind, { label: string; about: string; defaults: CampaignTexts; fields: (keyof CampaignTexts)[] }> = {
  newsletter: {
    label: "Newsletter",
    about: "Les dernières nouveautés : un mot d'introduction, puis les derniers t-shirts de la boutique avec leur photo et leur prix.",
    defaults: {
      subject: "Les nouveautés ArtSyde sont là",
      preheader: "Fraîchement imprimés : les derniers t-shirts de l'atelier.",
      eyebrow: "Nouveautés",
      title: "Fraîchement imprimés.",
      intro: "Salut {prenom}, voici les derniers t-shirts sortis de l'atelier. Les éditions limitées partent vite.",
      image: "",
      body: "",
      button: "Voir la boutique",
      url: "/#boutique",
      discount: "",
      discountText: "",
      code: "",
      until: "",
      productsTitle: "Les derniers arrivés.",
      products: "4",
    },
    fields: ["subject", "preheader", "eyebrow", "title", "intro", "image", "productsTitle", "products", "body", "button", "url"],
  },
  promo: {
    label: "Promotion",
    about: "Une offre : la réduction en grand, le code à saisir et la date de fin, puis le bouton vers la boutique.",
    defaults: {
      subject: "-20 % sur tout le site, {prenom}",
      preheader: "Ton code promo t'attend : quelques jours seulement.",
      eyebrow: "Offre limitée",
      title: "-20 % sur tes t-shirts.",
      intro: "Sur toute la collection et sur tes créations du studio 3D.",
      image: "",
      body: "Valable sur tout le site, une fois par commande. Non cumulable avec une autre offre.",
      button: "J'en profite",
      url: "/#boutique",
      discount: "-20 %",
      discountText: "sur toute la boutique et le studio 3D",
      code: "ARTSYDE20",
      until: "Jusqu'au dimanche soir",
      productsTitle: "",
      products: "0",
    },
    fields: ["subject", "preheader", "eyebrow", "title", "intro", "image", "discount", "discountText", "code", "until", "body", "button", "url"],
  },
  annonce: {
    label: "Annonce",
    about: "Une nouvelle à partager : une collection, un événement, l'atelier qui ferme quelques jours… Une photo, un texte, un bouton.",
    defaults: {
      subject: "Du nouveau chez ArtSyde",
      preheader: "Une nouvelle à te partager.",
      eyebrow: "Annonce",
      title: "Une nouvelle collection arrive.",
      intro: "On prépare quelque chose de spécial, et tu es parmi les premiers à le savoir.",
      image: "",
      body: "Rendez-vous sur le site dès sa sortie. Les premiers servis choisissent leur taille.",
      button: "Découvrir",
      url: "/",
      discount: "",
      discountText: "",
      code: "",
      until: "",
      productsTitle: "",
      products: "0",
    },
    fields: ["subject", "preheader", "eyebrow", "title", "intro", "image", "body", "button", "url"],
  },
};

export const CAMPAIGN_KINDS = Object.keys(CAMPAIGNS) as CampaignKind[];

/** Every field's label and size, as the editor shows it. */
export const CAMPAIGN_FIELDS: Record<keyof CampaignTexts, CampaignField> = {
  subject: { key: "subject", label: "Objet", max: 120 },
  preheader: { key: "preheader", label: "Aperçu dans la boîte de réception", max: 160 },
  eyebrow: { key: "eyebrow", label: "Petit titre (orange)", max: 60 },
  title: { key: "title", label: "Grand titre", max: 90 },
  intro: { key: "intro", label: "Introduction", long: true, max: 500 },
  image: { key: "image", label: "Photo d'ouverture", max: 500 },
  body: { key: "body", label: "Texte (sous le contenu)", long: true, max: 1500 },
  button: { key: "button", label: "Bouton", max: 40 },
  url: { key: "url", label: "Lien du bouton", max: 500, hint: "/studio, /#boutique… ou https://…" },
  discount: { key: "discount", label: "Réduction (en grand)", max: 20 },
  discountText: { key: "discountText", label: "Réduction : précision", max: 100 },
  code: { key: "code", label: "Code promo", max: 30, hint: "Crée-le aussi dans Admin > Codes promo, sinon il ne marchera pas au paiement." },
  until: { key: "until", label: "Jusqu'à quand", max: 60 },
  productsTitle: { key: "productsTitle", label: "Titre des nouveautés", max: 80 },
  products: { key: "products", label: "Nombre de t-shirts montrés (0 à 6)", max: 1 },
};

export const campaignKey = (kind: CampaignKind) => `email.${kind}`;

/** The saved draft over the template's defaults: an empty field keeps its default (except the image). */
export function mergeCampaign(kind: CampaignKind, saved: Partial<CampaignTexts> | null | undefined): CampaignTexts {
  const out = { ...CAMPAIGNS[kind].defaults };
  for (const k of CAMPAIGNS[kind].fields) {
    const v = saved?.[k];
    if (typeof v === "string" && (v.trim() || k === "image")) out[k] = v.trim().slice(0, CAMPAIGN_FIELDS[k].max);
  }
  return out;
}

/** Only the template's fields, trimmed to their size: what is saved. */
export function cleanCampaign(kind: CampaignKind, input: Partial<CampaignTexts> | null | undefined): Partial<CampaignTexts> {
  const out: Partial<CampaignTexts> = {};
  for (const k of CAMPAIGNS[kind]?.fields ?? []) {
    const v = input?.[k];
    if (typeof v === "string") out[k] = v.slice(0, CAMPAIGN_FIELDS[k].max);
  }
  return out;
}

/**
 * {prenom} replaced, or removed when the name is unknown, with the comma it leaves behind:
 * "Salut {prenom}, voici" → "Salut, voici" · "sur tout le site, {prenom}" → "sur tout le site".
 */
export function fillName(s: string, prenom: string) {
  if (prenom) return s.replaceAll("{prenom}", prenom);
  return s
    .replace(/\s*\{prenom\}/g, "")
    .replace(/,(\s*)(?=[.!?]|$)/gm, "$1")
    .replace(/^\s*,\s*/gm, "")
    .trim();
}

export const isCampaignKind = (v: unknown): v is CampaignKind => typeof v === "string" && v in CAMPAIGNS;
