/**
 * The welcome e-mail's words, editable in Admin > E-mails (SiteSetting "email.welcome"). In any text,
 * {prenom} becomes the customer's first name and {credits} the number of credits offered.
 * A field left empty falls back to the default below.
 */
export type WelcomeTexts = {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  giftBadge: string;
  giftTitle: string;
  giftText: string;
  button: string;
  link: string;
  stepsTitle: string;
  step1Title: string;
  step1Text: string;
  step2Title: string;
  step2Text: string;
  step3Title: string;
  step3Text: string;
  helpTitle: string;
  helpText: string;
};

export const WELCOME_KEY = "email.welcome";

export const DEFAULT_WELCOME: WelcomeTexts = {
  subject: "Bienvenue chez ArtSyde, {prenom}",
  preheader: "Ton compte est prêt : {credits} crédits studio t'attendent pour créer ton premier t-shirt.",
  eyebrow: "Ton compte est prêt",
  title: "Bienvenue, {prenom}.",
  intro: "Choisis un t-shirt de la collection, ou crée le tien en 3D : on l'imprime dans notre atelier, juste pour toi.",
  giftBadge: "Cadeau de bienvenue",
  giftTitle: "crédits studio offerts",
  giftText: "Pour importer tes images et télécharger ton design en HD.",
  button: "Créer mon t-shirt",
  link: "Ou découvrir la collection",
  stepsTitle: "Ton t-shirt en trois étapes.",
  step1Title: "Choisis ta couleur",
  step1Text: "Le vrai t-shirt oversize, en 3D, dans la teinte que tu veux.",
  step2Title: "Place ton design",
  step2Text: "Ton image ou ton texte, sur tout le devant et tout le dos.",
  step3Title: "Commande",
  step3Text: "Imprimé dans notre atelier, livré chez toi ou à retirer.",
  helpTitle: "Une question ?",
  helpText: "Une taille, un design, une commande d'équipe : écris-nous, on te répond vite.",
};

/** The fields as the admin form shows them, in order, with their label and size. */
export const WELCOME_FIELDS: { key: keyof WelcomeTexts; label: string; long?: boolean; max: number }[] = [
  { key: "subject", label: "Objet", max: 120 },
  { key: "preheader", label: "Aperçu dans la boîte de réception", max: 160 },
  { key: "eyebrow", label: "Petit titre (orange)", max: 60 },
  { key: "title", label: "Grand titre", max: 80 },
  { key: "intro", label: "Introduction", long: true, max: 400 },
  { key: "giftBadge", label: "Étiquette du cadeau", max: 40 },
  { key: "giftTitle", label: "Cadeau : titre (après le nombre de crédits)", max: 60 },
  { key: "giftText", label: "Cadeau : texte", long: true, max: 200 },
  { key: "button", label: "Bouton (vers le studio)", max: 40 },
  { key: "link", label: "Lien sous le bouton (vers la boutique)", max: 60 },
  { key: "stepsTitle", label: "Titre des étapes", max: 80 },
  { key: "step1Title", label: "Étape 1 : titre", max: 60 },
  { key: "step1Text", label: "Étape 1 : texte", max: 160 },
  { key: "step2Title", label: "Étape 2 : titre", max: 60 },
  { key: "step2Text", label: "Étape 2 : texte", max: 160 },
  { key: "step3Title", label: "Étape 3 : titre", max: 60 },
  { key: "step3Text", label: "Étape 3 : texte", max: 160 },
  { key: "helpTitle", label: "Aide : titre", max: 60 },
  { key: "helpText", label: "Aide : texte", long: true, max: 300 },
];

/** The saved words over the defaults: an empty field keeps its default. */
export function mergeWelcome(saved: Partial<WelcomeTexts> | null | undefined): WelcomeTexts {
  const out = { ...DEFAULT_WELCOME };
  for (const f of WELCOME_FIELDS) {
    const v = saved?.[f.key];
    if (typeof v === "string" && v.trim()) out[f.key] = v.trim().slice(0, f.max);
  }
  return out;
}

/** {prenom} and {credits} replaced. */
export const fill = (s: string, vars: { prenom: string; credits: number }) => s.replaceAll("{prenom}", vars.prenom).replaceAll("{credits}", String(vars.credits));
