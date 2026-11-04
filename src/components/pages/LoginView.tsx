"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { TeeIllustration } from "../ProductImage";

type Mode = "login" | "signup";
const EASE = [0.22, 1, 0.36, 1] as const;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] text-muted">{label}</span>
      {/* Red border + a short shake when an error appears. */}
      <motion.div animate={error ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }} transition={{ duration: 0.45 }} className={error ? "[&_.field]:!border-danger" : ""}>
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

export function LoginView() {
  const [mode, setMode] = useState<Mode>("login");
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const err: Record<string, string> = {};
    const id = String(f.get("id") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(id) && !/^\+?[\d\s]{8,}$/.test(id)) err.id = "Entre un e-mail ou un numéro valide.";
    if (pw.length < (mode === "signup" ? 8 : 1)) err.pw = mode === "signup" ? "8 caractères minimum." : "Entre ton mot de passe.";
    if (mode === "signup" && String(f.get("name") ?? "").trim().length < 2) err.name = "Indique ton prénom.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setStatus("loading");
    setTimeout(() => setStatus("done"), 1200); // TODO: call the API (Better Auth)
  }
  const s = strength(pw);
  const switchMode = (m: Mode) => (setMode(m), setErrors({}));

  return (
    <div className="mx-auto grid max-w-[1440px] md:min-h-[calc(100svh-7.5rem)] md:grid-cols-2">
      <motion.aside
        className="relative m-5 hidden overflow-hidden rounded-[28px] bg-surface md:block"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
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
            {status === "done" ? (
              <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
                
                <h1 className="display mt-5 text-6xl">{mode === "login" ? "Content de te revoir." : "Bienvenue !"}</h1>
                <p className="mt-5 text-muted">Démo : les comptes seront reliés au serveur prochainement.</p>
                <div className="mt-10 flex flex-wrap items-center gap-8">
                  <Link href="/studio" className="btn">Ouvrir le studio</Link>
                  <Link href="/#boutique" className="link-line">La boutique <span className="arrow">›</span></Link>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
                <LayoutGroup>
                  <div className="relative isolate inline-flex rounded-full bg-surface p-1" role="tablist">
                    {(["login", "signup"] as const).map((m) => (
                      <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={`relative rounded-full px-4 py-1.5 text-[14px] ${mode === m ? "font-medium" : "text-muted"}`}>
                        {m === "login" ? "Connexion" : "Créer un compte"}
                        {mode === m && <motion.span layoutId="auth-line" className="absolute inset-0 -z-10 rounded-full bg-bg shadow-[0_1px_4px_rgba(0,0,0,0.12)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                      </button>
                    ))}
                  </div>
                </LayoutGroup>

                <AnimatePresence mode="wait">
                  <motion.h1 key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.6, ease: EASE }} className="display mt-10 text-5xl md:text-6xl">
                    {mode === "login" ? "Content de te revoir." : "Crée ton compte."}
                  </motion.h1>
                </AnimatePresence>
                {mode === "signup" && <p className="mt-4 text-sm text-muted">5 crédits studio offerts, suivi de commande, favoris.</p>}

                <form onSubmit={submit} noValidate className="mt-10 space-y-8">
                  <AnimatePresence initial={false}>
                    {mode === "signup" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} className="overflow-hidden">
                        <Field label="Prénom" error={errors.name}>
                          <input name="name" autoComplete="given-name" className="field" />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Field label="E-mail ou téléphone" error={errors.id}>
                    <input name="id" autoComplete="username" className="field" placeholder="toi@exemple.com" />
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
                        <motion.span key={i} className="h-1 flex-1 origin-left rounded-full bg-accent" animate={{ scaleX: i < s ? 1 : 0, opacity: i < s ? 1 : 0.2 }} transition={{ duration: 0.5 }} />
                      ))}
                      <span className="w-16 text-right text-[13px] text-muted">{["Faible", "Faible", "Moyen", "Bon", "Fort"][s]}</span>
                    </div>
                  )}
                  {mode === "login" && (
                    <a href="#" className="block text-right text-[15px] text-link hover:underline">
                      Mot de passe oublié ?
                    </a>
                  )}
                  <button disabled={status === "loading"} className="btn w-full">
                    {status === "loading" ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Chargement" /> : mode === "login" ? "Se connecter" : "Créer mon compte"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
