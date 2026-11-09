"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { TeeIllustration } from "../ProductImage";
import { DUR, EASE, SPRING } from "@/lib/motion";

type Mode = "login" | "signup";
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] text-muted">{label}</span>
      {/* Red border + a short shake when an error appears. */}
      <motion.div animate={error ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className={error ? "[&_.field]:!border-danger" : ""}>
        {children}
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 block text-sm text-danger">
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

/** The Google "G", in its colours. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Better Auth's error codes, in the shop's voice. */
const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou mot de passe incorrect.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet e-mail : connecte-toi.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet e-mail : connecte-toi.",
  PASSWORD_TOO_SHORT: "8 caractères minimum.",
  INVALID_EMAIL: "Entre un e-mail valide.",
  EMAIL_NOT_VERIFIED: "Confirme d'abord ton adresse : on vient de t'envoyer un nouveau lien. Pense à regarder dans les spams.",
};

/** Seconds before the confirmation link can be sent again. */
const RESEND_AFTER = 30;

/**
 * Sign in or sign up: Google (when `google` is set up), or e-mail and password. Once signed in, `next`
 * (the page that sent here, e.g. the studio) or the account page.
 */
export function LoginView({ google = false, next = "/compte", failed = false }: { google?: boolean; next?: string; failed?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>(failed ? { form: "La connexion avec Google n'a pas abouti. Réessaie." } : {});
  const [status, setStatus] = useState<"idle" | "loading" | "google">("idle");
  // After an e-mail sign-up: the address the confirmation link went to (the "check your inbox" screen).
  const [sent, setSent] = useState<string | null>(null);
  const [resend, setResend] = useState<{ wait: number; note?: string }>({ wait: 0 });

  useEffect(() => {
    if (resend.wait <= 0) return;
    const t = setTimeout(() => setResend((r) => ({ ...r, wait: r.wait - 1 })), 1000);
    return () => clearTimeout(t);
  }, [resend.wait]);

  async function sendAgain() {
    if (!sent || resend.wait > 0) return;
    setResend({ wait: RESEND_AFTER });
    const r = await authClient.sendVerificationEmail({ email: sent, callbackURL: next });
    setResend({ wait: RESEND_AFTER, note: r.error ? "L'envoi n'a pas marché. Réessaie dans un instant." : "Nouveau lien envoyé." });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const err: Record<string, string> = {};
    const email = String(f.get("id") ?? "").trim();
    const name = String(f.get("name") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) err.id = "Entre un e-mail valide.";
    if (pw.length < (mode === "signup" ? 8 : 1)) err.pw = mode === "signup" ? "8 caractères minimum." : "Entre ton mot de passe.";
    if (mode === "signup" && name.length < 2) err.name = "Indique ton prénom.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setStatus("loading");
    // `callbackURL`: where the confirmation link brings the customer back, signed in (through /adresse-confirmee).
    const r = mode === "login" ? await authClient.signIn.email({ email, password: pw, callbackURL: next }) : await authClient.signUp.email({ email, password: pw, name, callbackURL: next });
    if (r.error) {
      setStatus("idle");
      // EMAIL_NOT_VERIFIED: an e-mail account not confirmed yet (a fresh link has just been sent).
      const code = r.error.code;
      if (!code || !AUTH_ERRORS[code]) console.error("Better Auth", r.error.status, r.error.code, r.error.message);
      const msg = (code && AUTH_ERRORS[code]) || "Ça n'a pas marché. Réessaie dans un instant.";
      setErrors(code === "PASSWORD_TOO_SHORT" ? { pw: msg } : code === "INVALID_EMAIL" ? { id: msg } : { form: msg });
      return;
    }
    // Signed up but not signed in: the address must be confirmed first.
    if (mode === "signup" && !r.data?.token) {
      setStatus("idle");
      setPw("");
      setSent(email);
      setResend({ wait: RESEND_AFTER });
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function withGoogle() {
    setStatus("google");
    setErrors({});
    const r = await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/connexion?erreur=google" });
    if (r?.error) {
      setStatus("idle");
      setErrors({ form: "La connexion avec Google n'a pas pu démarrer. Réessaie." });
    }
  }
  const s = strength(pw);
  const switchMode = (m: Mode) => (setMode(m), setErrors({}));

  return (
    <div className="mx-auto grid max-w-[1440px] md:min-h-[calc(100svh-7.5rem)] md:grid-cols-2">
      <motion.aside
        className="relative m-5 hidden overflow-hidden rounded-[28px] bg-surface md:block"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: DUR.hero, ease: EASE.inOut }}
      >
        <TeeIllustration color="#1F2A44" art="script" className="idle-float absolute inset-[14%] h-[62%] w-[72%]" />
        <div className="absolute inset-x-10 bottom-10">
          <p className="display text-4xl">Crée, commande, suis tes t-shirts.</p>
          <p className="mt-3 text-[17px] text-muted">5 crédits studio offerts à l&apos;inscription.</p>
        </div>
      </motion.aside>

      <section className="flex items-center px-5 py-16 md:px-16 lg:px-24">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.slow, ease: EASE.out }}>
                <h1 className="display text-5xl md:text-6xl">Vérifie ta boîte mail.</h1>
                <p className="mt-6 text-[17px] text-muted">
                  On a envoyé un lien de confirmation à <span className="font-medium text-ink">{sent}</span>. Clique dessus pour activer ton compte et recevoir tes crédits studio.
                </p>
                <p className="mt-3 text-sm text-muted">Rien reçu ? Regarde dans les spams, ou demande un nouveau lien. Le lien est valable 24 heures.</p>
                <div className="mt-10 space-y-4">
                  <button type="button" onClick={sendAgain} disabled={resend.wait > 0} className="btn-outline w-full disabled:opacity-50">
                    {resend.wait > 0 ? `Renvoyer le lien (${resend.wait} s)` : "Renvoyer le lien"}
                  </button>
                  {resend.note && (
                    <p role="status" className="text-center text-sm text-muted">
                      {resend.note}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSent(null);
                      setResend({ wait: 0 });
                      switchMode("login");
                    }}
                    className="block w-full text-center text-[15px] text-link hover:underline"
                  >
                    Revenir à la connexion
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE.out }}>
                <LayoutGroup>
                  <div className="relative isolate inline-flex rounded-full bg-surface p-1" role="tablist">
                    {(["login", "signup"] as const).map((m) => (
                      <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={`relative rounded-full px-4 py-1.5 text-[14px] ${mode === m ? "font-medium" : "text-muted"}`}>
                        {m === "login" ? "Connexion" : "Créer un compte"}
                        {mode === m && <motion.span layoutId="auth-line" className="absolute inset-0 -z-10 rounded-full bg-bg shadow-[0_1px_4px_rgba(0,0,0,0.12)]" transition={SPRING.snappy} />}
                      </button>
                    ))}
                  </div>
                </LayoutGroup>

                <AnimatePresence mode="wait">
                  <motion.h1 key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: DUR.base, ease: EASE.out }} className="display mt-10 text-5xl md:text-6xl">
                    {mode === "login" ? "Content de te revoir." : "Crée ton compte."}
                  </motion.h1>
                </AnimatePresence>
                {mode === "signup" && <p className="mt-4 text-sm text-muted">5 crédits studio offerts, et le suivi de tes commandes.</p>}

                {google && (
                  <>
                    <button type="button" onClick={withGoogle} disabled={status !== "idle"} className="mt-10 flex w-full items-center justify-center gap-3 rounded-full border border-line bg-bg px-6 py-3 text-[15px] font-medium transition-colors hover:border-muted disabled:opacity-50">
                      {status === "google" ? <span className="h-4 w-4 animate-spin rounded-full border border-ink border-t-transparent" aria-label="Redirection vers Google" /> : <GoogleMark />}
                      Continuer avec Google
                    </button>
                    <p className="mt-8 flex items-center gap-4 text-[13px] text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">ou avec ton e-mail</p>
                  </>
                )}

                <form onSubmit={submit} noValidate className={`${google ? "mt-8" : "mt-10"} space-y-8`}>
                  <AnimatePresence initial={false}>
                    {mode === "signup" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: DUR.base, ease: EASE.out }} className="overflow-hidden">
                        <Field label="Prénom" error={errors.name}>
                          <input name="name" autoComplete="given-name" className="field" />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Field label="E-mail" error={errors.id}>
                    <input name="id" type="email" autoComplete="email" className="field" placeholder="toi@exemple.com" />
                  </Field>
                  <Field label="Mot de passe" error={errors.pw}>
                    <div className="relative">
                      <input
                        name="pw"
                        type={show ? "text" : "password"}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        className="field pr-16"
                      />
                      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-link hover:underline">
                        {show ? "Masquer" : "Afficher"}
                      </button>
                    </div>
                  </Field>
                  {mode === "signup" && pw && (
                    <div className="flex items-center gap-2" aria-live="polite">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.span key={i} className="h-1 flex-1 origin-left rounded-full bg-accent" animate={{ scaleX: i < s ? 1 : 0, opacity: i < s ? 1 : 0.2 }} transition={{ duration: DUR.base, ease: EASE.out }} />
                      ))}
                      <span className="w-16 text-right text-[13px] text-muted">{["Faible", "Faible", "Moyen", "Bon", "Fort"][s]}</span>
                    </div>
                  )}
                  <AnimatePresence>
                    {errors.form && (
                      <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="text-sm text-danger">
                        {errors.form}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <button disabled={status !== "idle"} className="btn w-full">
                    {status === "loading" ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Chargement" /> : mode === "login" ? "Se connecter" : "Créer mon compte"}
                  </button>
                  <p className="text-center text-xs text-muted">
                    En continuant, avec Google ou ton e-mail, tu acceptes nos{" "}
                    <a href="/conditions-d-utilisation" className="underline underline-offset-2 hover:text-ink">
                      conditions d&apos;utilisation
                    </a>
                    .
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
