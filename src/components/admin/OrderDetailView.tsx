import Link from "next/link";
import { ProductImage } from "../ProductImage";
import { FadeUp } from "../Reveal";
import { STAGGER } from "@/lib/motion";
import { formatFCFA } from "@/lib/products";
import type { DeliveryMethod, OrderStatus } from "@/generated/prisma/client";
import { DELIVERY_METHOD, ORDER_STATUS, PAYMENT_STATUS, colorName, longDate, paymentMethod, plural, shortDate } from "@/lib/admin/labels";
import { getOrder, load } from "@/server/admin/queries";
import { PRINT_QUALITY } from "@/lib/studio";
import { OrderActions } from "./OrderActions";
import { Track } from "./Track";
import { StudioTee3D } from "./StudioTee3D";
import { studioFiles } from "@/lib/studio-files";
import { DbNotice, Empty, MoreLink, PageTitle, StatusLabel, Swatch } from "./ui";

/** The steps this order goes through, and how far it is. */
function progress(status: OrderStatus, delivery: DeliveryMethod, hasStudio: boolean) {
  const steps = ["Payée", ...(hasStudio ? ["En conception"] : []), "En impression", delivery === "RETRAIT" ? "Prête à l'atelier" : "En livraison", "Livrée"];
  const at: Partial<Record<OrderStatus, string>> = { PAID: "Payée", IN_DESIGN: hasStudio ? "En conception" : "Payée", IN_PRODUCTION: "En impression", SHIPPED: steps[steps.length - 2], DELIVERED: "Livrée" };
  return { steps, step: at[status] ? steps.indexOf(at[status]) : -1 };
}

export async function OrderDetailView({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const r = await load(() => getOrder(decodeURIComponent(reference)));
  if (r.problem)
    return (
      <>
        <PageTitle eyebrow="Commande" lines={[`${decodeURIComponent(reference)}.`]} aside={<MoreLink href="/admin/commandes">Toutes les commandes</MoreLink>} />
        <DbNotice problem={r.problem} />
      </>
    );
  const o = r.data;
  if (!o)
    return (
      <>
        <PageTitle eyebrow="Commande" lines={[`${decodeURIComponent(reference)}.`]} />
        <Empty title={`Aucune commande « ${decodeURIComponent(reference)} ».`} actions={<MoreLink href="/admin/commandes">Toutes les commandes</MoreLink>}>
          Vérifie la référence, ou cherche la commande par client ou par téléphone.
        </Empty>
      </>
    );

  const hasStudio = o.items.some((i) => !i.productId);
  const { steps, step } = progress(o.status, o.delivery, hasStudio);
  const pay = PAYMENT_STATUS[o.paymentStatus];
  const units = o.items.reduce((n, i) => n + i.quantity, 0);
  // A pickup order that is "shipped" is waiting at the workshop: say so everywhere, as the track does.
  const statusLabel = o.status === "SHIPPED" && o.delivery === "RETRAIT" ? "Prête à l'atelier" : ORDER_STATUS[o.status].label;

  return (
    <>
      <PageTitle
        eyebrow={`Commande du ${longDate(o.createdAt)}`}
        lines={[{ text: `${o.reference}.`, muted: `${statusLabel}.` }]}
        aside={<MoreLink href="/admin/commandes">Toutes les commandes</MoreLink>}
      />

      <FadeUp className="tile p-8 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="text-[21px] font-semibold">Suivi</p>
          <StatusLabel tone={ORDER_STATUS[o.status].tone}>{statusLabel}</StatusLabel>
        </div>
        {o.status === "CANCELLED" ? (
          <p className="mt-6 text-muted">Commande annulée{o.paymentStatus === "REFUNDED" ? ", paiement remboursé." : ", rien n'a été encaissé."}</p>
        ) : (
          <div className="mt-10">
            <Track steps={steps} step={step} />
            {o.status === "PENDING_PAYMENT" && <p className="mt-8 text-sm text-muted">En attente du paiement : rien à lancer à l&apos;atelier pour l&apos;instant.</p>}
          </div>
        )}
        <OrderActions orderId={o.id} status={o.status} hasStudio={hasStudio} pickup={o.delivery === "RETRAIT"} />
      </FadeUp>

      <div className="mt-14 grid items-start gap-14 md:grid-cols-[1.4fr_1fr]">
        <FadeUp delay={STAGGER.item}>
          <p className="border-b border-line pb-4 text-[21px] font-semibold">{plural(units, "article")}</p>
          <ul>
            {o.items.map((it) => (
              <li key={it.id} className="flex gap-5 border-b border-line py-5">
                {it.previewUrl ? (
                  // The studio's capture of the 3D t-shirt, taken when the customer added it to the cart.
                  // eslint-disable-next-line @next/next/no-img-element -- a stored data URL
                  <img src={it.previewUrl} alt="Aperçu 3D de la création" width={220} height={220} className="aspect-square w-24 shrink-0 rounded-lg border border-line bg-sand object-cover" />
                ) : (
                  <ProductImage color={it.color} art={it.product?.art ?? undefined} className="aspect-[4/5] w-16 shrink-0" zoom={false} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{it.product?.name ?? it.savedDesign?.name ?? "Création personnalisée"}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <Swatch hex={it.color} />
                        {it.productId ? colorName(it.color) : `Création personnalisée · ${colorName(it.color)}`} · Taille {it.size} · × {it.quantity}
                        {it.printQuality && ` · Impression ${PRINT_QUALITY[it.printQuality].label}`}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm tabular-nums">{formatFCFA(it.unitPriceXof * it.quantity)}</p>
                  </div>
                  {it.customDesigns.length > 0 ? (
                    <>
                    <ul className="mt-3 flex flex-wrap gap-3 text-sm">
                      {it.customDesigns.map((f) => (
                        <li key={f.id}>
                          {/* The studio's print file, at the quality ordered, without watermark: what the workshop prints. */}
                          <a href={f.fileUrl} target="_blank" rel="noreferrer" download={`${o.reference}-${f.fileName}`} className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-link transition-colors hover:border-accent">
                            <span aria-hidden>↓</span> Fichier d&apos;impression · {f.layer === 0 ? "Devant" : f.layer === 1 ? "Dos" : `Calque ${f.layer + 1}`}
                          </a>
                          {f.notes && <span className="text-muted"> · {f.notes}</span>}
                        </li>
                      ))}
                    </ul>
                    <StudioTee3D color={it.color} files={studioFiles(it.customDesigns)} />
                    </>
                  ) : (
                    !it.productId && <p className="mt-3 text-sm text-new">Pas de fichier d&apos;impression avec cette création : contacte le client pour récupérer son design.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd className="tabular-nums">{formatFCFA(o.subtotalXof)}</dd></div>
            {o.discountXof > 0 && <div className="flex justify-between"><dt className="text-muted">Code promo {o.promoCode}</dt><dd className="tabular-nums text-ok">-{formatFCFA(o.discountXof)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{DELIVERY_METHOD[o.delivery].label}</dt><dd className="tabular-nums">{o.deliveryXof ? formatFCFA(o.deliveryXof) : "Offert"}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-4"><dt className="font-semibold">Total</dt><dd className="display text-3xl tabular-nums">{formatFCFA(o.totalXof)}</dd></div>
          </dl>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp delay={STAGGER.item * 2} className="tile p-8">
            <p className="text-[21px] font-semibold">Client</p>
            <p className="mt-4 text-[17px] font-semibold">{o.customerName}</p>
            <p className="mt-1 text-sm">
              <a href={`tel:${o.customerPhone.replace(/\s+/g, "")}`} className="text-link hover:underline">{o.customerPhone}</a>
              {o.customerEmail && (
                <>
                  {" · "}
                  <a href={`mailto:${o.customerEmail}`} className="text-link hover:underline">{o.customerEmail}</a>
                </>
              )}
            </p>
            <p className="mt-5 border-t border-line pt-5 text-sm text-muted">
              {o.customer ? (
                <>
                  Client inscrit depuis le {shortDate(o.customer.createdAt)} ·{" "}
                  <Link href={`/admin/commandes?q=${encodeURIComponent(o.customerPhone)}`} className="text-link hover:underline">{plural(o.customer._count.orders, "commande")}</Link>
                </>
              ) : (
                "Commande passée sans compte."
              )}
            </p>
          </FadeUp>

          <FadeUp delay={STAGGER.item * 3} className="tile p-8">
            <p className="text-[21px] font-semibold">Livraison</p>
            <p className="mt-4 text-[17px] font-semibold">{DELIVERY_METHOD[o.delivery].label}</p>
            <p className="text-sm text-muted">{DELIVERY_METHOD[o.delivery].note}</p>
            {o.delivery !== "RETRAIT" && (
              <p className="mt-5 text-sm leading-relaxed">
                {o.address}
                <br />
                {o.city}
              </p>
            )}
            {o.deliveryNotes && <p className="mt-5 border-t border-line pt-5 text-sm text-muted">« {o.deliveryNotes} »</p>}
          </FadeUp>

          <FadeUp delay={STAGGER.item * 4} className="tile p-8">
            <p className="text-[21px] font-semibold">Paiement</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">État</dt><dd><StatusLabel tone={pay.tone}>{pay.label}</StatusLabel></dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Moyen</dt><dd>{paymentMethod(o.paymentMethod)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Transaction</dt><dd className="tabular-nums">{o.paymentRef ?? "—"}</dd></div>
            </dl>
          </FadeUp>
        </div>
      </div>
    </>
  );
}
