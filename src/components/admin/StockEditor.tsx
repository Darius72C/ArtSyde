"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TEE_COLORS } from "@/lib/data";
import { addStockColour, receiveStock, removeStockColour, setColourThreshold, setStockQuantity, type StockResult } from "@/server/admin/stock";
import { ColorPicker } from "../ColorPicker";
import { StatusLabel, Swatch, TableScroll, table, td, th } from "./ui";

export type StockLine = { id: string; size: string; quantity: number; lowAt: number };
export type StockColour = { hex: string; name: string; sizes: StockLine[] };

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const NEW = "__new__";

/** A number cell that saves itself when it loses focus or on Enter, if it changed. */
function NumberCell({ value, label, tone, onSave }: { value: number; label: string; tone?: "new" | "danger"; onSave: (n: number) => Promise<StockResult> }) {
  const [text, setText] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    // The server sent a new value (after a delivery, an order): show it.
    setSeen(value);
    setText(String(value));
  }
  async function save() {
    const n = Number(text);
    if (text.trim() === String(value)) return;
    if (!Number.isInteger(n) || n < 0) {
      setBad(true);
      return;
    }
    setBusy(true);
    const r = await onSave(n);
    setBusy(false);
    setBad(!r.ok);
    if (!r.ok) setText(String(value));
  }
  return (
    <input
      inputMode="numeric"
      aria-label={label}
      value={text}
      disabled={busy}
      onChange={(e) => (setText(e.target.value.replace(/[^\d]/g, "")), setBad(false))}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
      className={`w-16 rounded-lg border bg-bg px-2 py-1 text-right tabular-nums outline-none transition-colors focus:border-accent disabled:opacity-50 ${bad ? "border-danger" : "border-line"} ${tone === "danger" ? "font-medium text-danger" : tone === "new" ? "font-medium text-new" : ""}`}
    />
  );
}

/**
 * Stock of blank t-shirts (/admin/produits): every quantity and threshold editable in place, a delivery form
 * ("Arrivage") that adds to a line or creates a new colour, and removing a colour.
 */
export function StockEditor({ colours }: { colours: StockColour[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const sizes = ALL_SIZES.filter((s) => colours.some((c) => c.sizes.some((x) => x.size === s)));

  // Delivery form.
  const [pick, setPick] = useState(colours[0]?.hex ?? NEW);
  const [newHex, setNewHex] = useState<string>(TEE_COLORS[0].hex.toLowerCase());
  const [newName, setNewName] = useState("");
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState("");

  const run = async (fn: () => Promise<StockResult>) => {
    const r = await fn();
    if (!r.ok || r.message) setNote({ ok: r.ok, text: r.ok ? (r.message ?? "") : r.message });
    router.refresh();
    return r;
  };

  const receive = (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = pick === NEW;
    startTransition(async () => {
      const r = await run(() => receiveStock({ hex: isNew ? newHex : pick, name: isNew ? newName : undefined, size, quantity: Number(qty) }));
      if (r.ok) {
        setQty("");
        if (isNew) {
          setPick(newHex);
          setNewName("");
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      {colours.length > 0 ? (
        <div>
          <TableScroll>
            <table className={`${table} min-w-[640px]`}>
              <thead>
                <tr>
                  <th className={th}>Couleur</th>
                  {sizes.map((s) => (
                    <th key={s} className={`${th} text-right`}>
                      {s}
                    </th>
                  ))}
                  <th className={`${th} text-right`}>Total</th>
                  <th className={`${th} text-right`}>Seuil</th>
                  <th className={th}>
                    <span className="sr-only">Retirer</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {colours.map((c) => (
                  <tr key={c.hex}>
                    <td className={td}>
                      <span className="flex items-center gap-3">
                        <Swatch hex={c.hex} />
                        <span className="font-semibold">{c.name}</span>
                      </span>
                    </td>
                    {sizes.map((s) => {
                      const line = c.sizes.find((x) => x.size === s);
                      if (!line)
                        return (
                          <td key={s} className={`${td} text-right`}>
                            <button type="button" disabled={busy} onClick={() => startTransition(async () => void (await run(() => addStockColour({ hex: c.hex, name: c.name, sizes: [s] }))))} className="text-sm text-link hover:underline" aria-label={`Ajouter la taille ${s} en ${c.name}`}>
                              + {s}
                            </button>
                          </td>
                        );
                      const tone = line.quantity <= 0 ? "danger" : line.quantity <= line.lowAt ? "new" : undefined;
                      return (
                        <td key={s} className={`${td} text-right`}>
                          <NumberCell value={line.quantity} label={`${c.name}, taille ${s}`} tone={tone} onSave={(n) => run(() => setStockQuantity(line.id, n))} />
                        </td>
                      );
                    })}
                    <td className={`${td} text-right font-semibold tabular-nums`}>{c.sizes.reduce((n, x) => n + x.quantity, 0)}</td>
                    <td className={`${td} text-right`}>
                      <NumberCell value={c.sizes[0]?.lowAt ?? 5} label={`Seuil de stock bas, ${c.name}`} onSave={(n) => run(() => setColourThreshold(c.hex, n))} />
                    </td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      {removing === c.hex ? (
                        <span className="flex items-center justify-end gap-3 text-sm">
                          <button type="button" disabled={busy} onClick={() => startTransition(async () => (await run(() => removeStockColour(c.hex)), setRemoving(null)))} className="text-danger hover:underline">
                            Retirer {c.name} ?
                          </button>
                          <button type="button" onClick={() => setRemoving(null)} className="text-link hover:underline">
                            Non
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setRemoving(c.hex)} className="text-sm text-muted hover:text-danger" aria-label={`Retirer ${c.name} du stock`}>
                          Retirer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span>Modifie un nombre puis appuie sur Entrée : c&apos;est enregistré.</span>
            <StatusLabel tone="new">À ou sous le seuil</StatusLabel>
            <StatusLabel tone="danger">Épuisé</StatusLabel>
          </p>
        </div>
      ) : (
        <p className="text-muted">Pas encore de stock. Ajoute ton premier arrivage de t-shirts vierges ci-dessous.</p>
      )}

      <form onSubmit={receive} className="rounded-2xl border border-line p-6">
        <p className="text-[17px] font-semibold">Arrivage</p>
        <p className="mt-1 text-sm text-muted">Des t-shirts vierges reçus : ils s&apos;ajoutent au stock.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-[1.4fr_0.8fr_0.8fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-[14px] text-muted">Couleur</span>
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="field">
              {colours.map((c) => (
                <option key={c.hex} value={c.hex}>
                  {c.name}
                </option>
              ))}
              <option value={NEW}>Nouvelle couleur…</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[14px] text-muted">Taille</span>
            <select value={size} onChange={(e) => setSize(e.target.value)} className="field">
              {ALL_SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[14px] text-muted">Quantité reçue</span>
            <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="50" className="field" />
          </label>
          <button disabled={busy || !qty} className="btn">
            Ajouter au stock
          </button>
        </div>
        {pick === NEW && (
          <div className="mt-6 grid gap-6 border-t border-line pt-6 md:grid-cols-[1fr_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-[14px] text-muted">Nom de la couleur</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} placeholder="Vert bouteille" className="field" />
            </label>
            <ColorPicker initial={newHex} presets={TEE_COLORS} presetsLabel="Teintes de l'atelier" onChange={setNewHex} />
          </div>
        )}
        {note && note.text && (
          <p role="status" className={`mt-4 text-sm ${note.ok ? "text-ok" : "text-danger"}`}>
            {note.text}
          </p>
        )}
      </form>
    </div>
  );
}
