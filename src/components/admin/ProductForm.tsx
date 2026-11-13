"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Field } from "../pages/CheckoutView";
import { ColorPicker } from "../ColorPicker";
import { TEE_COLORS } from "@/lib/data";
import { DUR, EASE, SPRING } from "@/lib/motion";
import { saveProduct, type ProductFormState } from "@/server/admin/products";
import { uploadMedia } from "./uploadMedia";

export type EditableProduct = { id: string; name: string; priceXof: number; oldPriceXof: number | null; tag: string | null; colors: string[]; sizes: string[]; active: boolean };

const TAGS = [
  { value: "", label: "Aucune" },
  { value: "NOUVEAU", label: "Nouveau" },
  { value: "BEST_SELLER", label: "Best-seller" },
  { value: "PROMO", label: "Promo" },
];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function FieldError({ children }: { children?: string }) {
  return (
    <AnimatePresence>
      {children && (
        <motion.span initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="mt-2 block overflow-hidden text-sm text-danger">
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

const colorName = (hex: string) => TEE_COLORS.find((c) => c.hex.toLowerCase() === hex)?.name ?? hex.toUpperCase();

type Pending = { photos: File[]; flats: File[] };
const PICK = { photos: { label: "Photos", note: "La première est celle de la boutique." }, flats: { label: "Mockups", note: "Le design posé à plat (onglet Mockup)." } } as const;
const MAX_FILES = 12;
const MAX_SIZE = 20 * 1024 * 1024; // same limit as the server (presignPhoto)

/** New product only: photos and mockups picked now, uploaded right after the product is created. */
function PendingPicker({ kind, files, onChange, disabled }: { kind: keyof Pending; files: File[]; onChange: (f: File[]) => void; disabled: boolean }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const w = PICK[kind];
  return (
    <fieldset>
      <legend className="mb-3 text-[14px] text-muted">
        {w.label} <span className="text-muted/80">· {w.note}</span>
      </legend>
      {files.length > 0 && (
        <ul className="mb-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {files.map((f, i) => (
            <li key={urls[i]} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
              <img src={urls[i]} alt={f.name} className="aspect-[4/5] w-full rounded-xl bg-bg object-cover" />
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-bg/90 text-[13px] text-ink shadow transition-colors hover:text-danger">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className={`btn-outline cursor-pointer ${disabled || files.length >= MAX_FILES ? "pointer-events-none opacity-50" : ""}`}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(ev) => {
            const picked = [...(ev.target.files ?? [])].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= MAX_SIZE);
            onChange([...files, ...picked].slice(0, MAX_FILES));
            ev.target.value = "";
          }}
        />
        {files.length ? `Ajouter d'autres ${w.label.toLowerCase()}` : `Choisir des ${w.label.toLowerCase()}`}
      </label>
    </fieldset>
  );
}

type FormProps = { product: EditableProduct; uploads?: boolean };

/**
 * Name, prices, label, colours, sizes and visibility of one product. Empty `product.id` creates one; then
 * photos and mockups can be picked in the same form (`uploads`: R2 is configured): they are uploaded once the
 * product exists, and the admin lands on the product with everything in place.
 *
 * With Cache Components, Next.js hides a page on navigation instead of unmounting it (React <Activity>), and shows
 * the same instance again on the next visit: /admin/produits/nouveau would come back filled with the last model,
 * its photos and its "saved" message. So once a creation has been submitted, the form is remounted empty as soon
 * as the page is hidden. A draft left without submitting is kept, as Next.js intends.
 * https://nextjs.org/docs/app/guides/preserving-ui-state
 */
export function ProductForm({ product, uploads = false }: FormProps) {
  const isNew = !product.id;
  const [generation, setGeneration] = useState(0);
  const submitted = useRef(false);

  // The cleanup runs when the page is hidden (or left): a submitted creation starts over from an empty form.
  useLayoutEffect(() => {
    if (!isNew) return;
    return () => {
      if (!submitted.current) return;
      submitted.current = false;
      setGeneration((g) => g + 1);
    };
  }, [isNew]);
  // The form tells whether its creation is under way (sent) or not (refused); the ref stays owned here.
  const markSubmitted = useCallback((sent: boolean) => {
    submitted.current = sent;
  }, []);

  return <ProductFormBody key={generation} product={product} uploads={uploads} onSubmitted={isNew ? markSubmitted : undefined} />;
}

function ProductFormBody({ product, uploads = false, onSubmitted }: FormProps & { onSubmitted?: (sent: boolean) => void }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});
  const e = state.errors ?? {};
  const isNew = !product.id;
  const router = useRouter();
  const [files, setFiles] = useState<Pending>({ photos: [], flats: [] });
  const [sending, setSending] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const toSend = files.photos.length + files.flats.length;

  // Refused (field errors, or the save failed): the admin stays on the form, which is not a finished creation.
  useEffect(() => {
    if (state.errors || state.message) onSubmitted?.(false);
  }, [state, onSubmitted]);

  // Once the product is created: upload what was picked, one file after the other, then open the product.
  // Effects run again each time a hidden page is shown again: `uploadedFor` keeps this to once per product,
  // so the photos are never sent a second time to the model created before.
  const uploadedFor = useRef<string | null>(null);
  useEffect(() => {
    const id = state.created;
    if (!id || uploadedFor.current === id) return;
    uploadedFor.current = id;
    let stop = false;
    (async () => {
      const queue = [...files.photos.map((f) => ["photos", f] as const), ...files.flats.map((f) => ["flats", f] as const)];
      const failed: string[] = [];
      // The uploads go on if the admin leaves the page meanwhile; only the final redirect is skipped.
      for (const [i, [kind, file]] of queue.entries()) {
        setSending({ done: i, total: queue.length, failed });
        try {
          await uploadMedia(id, file, kind);
        } catch (err) {
          failed.push(`${file.name} : ${err instanceof Error ? err.message : "envoi impossible."}`);
        }
      }
      if (stop) return;
      setSending({ done: queue.length, total: queue.length, failed });
      if (!failed.length) router.push(`/admin/produits/${id}?nouveau=1`);
    })();
    return () => {
      stop = true;
    };
    // Runs once per created product; the files are the ones picked when it was submitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.created]);
  // Colours: any tint, chosen with the same colour selector as the studio. Each one is sent as a hidden "colors" field.
  const [colors, setColors] = useState(() => [...new Set(product.colors.map((c) => c.toLowerCase()))]);
  const [draft, setDraft] = useState(TEE_COLORS[0].hex.toLowerCase());
  const hasDraft = colors.includes(draft);

  return (
    <form
      action={(fd) => {
        if (isNew && toSend) fd.set("then", "upload");
        onSubmitted?.(true);
        action(fd);
      }}
      noValidate
      className="space-y-8"
    >
      <input type="hidden" name="id" value={product.id} />
      <Field name="name" label="Nom du modèle" defaultValue={product.name} error={e.name} maxLength={80} />
      <div className="grid gap-8 sm:grid-cols-2">
        <Field name="price" label="Prix (FCFA)" inputMode="numeric" defaultValue={product.priceXof || ""} error={e.price} />
        <Field name="oldPrice" label="Prix barré (FCFA, facultatif)" inputMode="numeric" defaultValue={product.oldPriceXof ?? ""} error={e.oldPrice} />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[14px] text-muted">Étiquette</span>
        <select name="tag" defaultValue={product.tag ?? ""} className="field">
          {TAGS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-3 text-[14px] text-muted">Couleurs proposées</legend>
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <AnimatePresence initial={false}>
            {colors.map((hex) => (
              <motion.span
                key={hex}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING.pop}
                className="flex items-center gap-2 rounded-full border border-ink bg-bg py-1.5 pl-3 pr-1.5 text-[14px] font-medium"
              >
                <input type="hidden" name="colors" value={hex} />
                <span className="h-3 w-3 rounded-full ring-1 ring-line" style={{ background: hex }} />
                {colorName(hex)}
                <button type="button" onClick={() => setColors((cs) => cs.filter((c) => c !== hex))} aria-label={`Retirer ${colorName(hex)}`} className="grid h-5 w-5 place-items-center rounded-full text-muted transition-colors duration-300 hover:bg-surface hover:text-ink">
                  ×
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {colors.length === 0 && <span className="text-sm text-muted">Aucune couleur pour l&apos;instant : choisis-en une ci-dessous.</span>}
        </div>
        <FieldError>{e.colors}</FieldError>
        <div className="mt-5 grid items-start gap-6 rounded-2xl border border-line p-5 md:grid-cols-[minmax(0,320px)_1fr]">
          <ColorPicker initial={draft} presets={TEE_COLORS} onChange={(hex) => setDraft(hex.toLowerCase())} />
          <div className="flex flex-col items-start gap-4">
            <span className="h-16 w-16 rounded-2xl ring-1 ring-line" style={{ background: draft }} aria-hidden />
            <p className="text-sm text-muted">{colorName(draft)}</p>
            <button type="button" disabled={hasDraft} onClick={() => setColors((cs) => [...cs, draft])} className="btn-outline">
              {hasDraft ? "Déjà proposée" : "Ajouter cette couleur"}
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[14px] text-muted">Tailles</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <label key={s} className="cursor-pointer">
              <input type="checkbox" name="sizes" value={s} defaultChecked={product.sizes.includes(s)} className="peer sr-only" />
              <span className="block min-w-12 rounded-full border border-line px-3 py-1.5 text-center text-[14px] text-muted transition-colors duration-300 peer-checked:border-ink peer-checked:bg-bg peer-checked:font-medium peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">{s}</span>
            </label>
          ))}
        </div>
        <FieldError>{e.sizes}</FieldError>
      </fieldset>

      {isNew && uploads && (
        <div className="space-y-8 border-t border-line pt-8">
          <PendingPicker kind="photos" files={files.photos} onChange={(photos) => setFiles((f) => ({ ...f, photos }))} disabled={pending || Boolean(sending)} />
          <PendingPicker kind="flats" files={files.flats} onChange={(flats) => setFiles((f) => ({ ...f, flats }))} disabled={pending || Boolean(sending)} />
          <p className="text-sm text-muted">JPG, PNG ou WebP, 20 Mo maximum. Elles sont envoyées à la création du modèle ; l&apos;impression 3D se règle ensuite sur sa page.</p>
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" name="active" defaultChecked={product.active} className="h-5 w-5 accent-[var(--accent)]" />
        En ligne dans la boutique
      </label>

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
        <button disabled={pending || Boolean(sending && !sending.failed.length)} className="btn">
          {pending || (sending && sending.done < sending.total) ? (
            <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" />
          ) : isNew ? (
            toSend ? `Créer le modèle avec ${toSend} image${toSend > 1 ? "s" : ""}` : "Créer le modèle"
          ) : (
            "Enregistrer"
          )}
        </button>
        {sending && (
          <p role="status" className={`text-sm ${sending.failed.length && sending.done === sending.total ? "text-danger" : "text-muted"}`}>
            {sending.done < sending.total
              ? `Modèle créé. Envoi des images… ${sending.done + 1} sur ${sending.total}`
              : sending.failed.length
                ? `Modèle créé, mais ${sending.failed.length} image${sending.failed.length > 1 ? "s n'ont" : " n'a"} pas pu être envoyée${sending.failed.length > 1 ? "s" : ""}.`
                : "Modèle créé avec ses images."}
          </p>
        )}
        <AnimatePresence>
          {(state.saved || state.message) && !pending && !sending && (
            <motion.p key={state.message ?? "ok"} role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className={`text-sm ${state.message ? "text-danger" : "text-ok"}`}>
              {state.message ?? "Enregistré. La boutique est à jour."}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      {sending && sending.done === sending.total && sending.failed.length > 0 && state.created && (
        <div role="alert" className="space-y-2 text-sm">
          {sending.failed.map((f) => (
            <p key={f} className="text-danger">
              {f}
            </p>
          ))}
          <Link href={`/admin/produits/${state.created}?nouveau=1`} className="link-line !text-[15px]">
            Ouvrir le modèle pour réessayer <span className="arrow">›</span>
          </Link>
        </div>
      )}
    </form>
  );
}
