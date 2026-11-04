import Link from "next/link";
import { formatFCFA } from "@/lib/products";
import { ORDER_STATUS, PAYMENT_STATUS, dateTime, paymentMethod } from "@/lib/admin/labels";
import type { OrderRow } from "@/lib/admin/queries";
import { StatusLabel, TableScroll, table, td, th } from "./ui";

/** Orders as table rows; `compact` keeps reference, customer, total and status (overview). */
export function OrderTable({ orders, compact = false }: { orders: OrderRow[]; compact?: boolean }) {
  return (
    <TableScroll>
      <table className={`${table} ${compact ? "min-w-[480px]" : "min-w-[760px]"}`}>
        <thead>
          <tr>
            <th className={th}>Commande</th>
            <th className={th}>Client</th>
            {!compact && <th className={th}>Articles</th>}
            {!compact && <th className={th}>Paiement</th>}
            <th className={`${th} text-right`}>Total</th>
            <th className={th}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const units = o.items.reduce((n, i) => n + i.quantity, 0);
            const pay = PAYMENT_STATUS[o.paymentStatus];
            return (
              <tr key={o.id}>
                <td className={td}>
                  <Link href={`/admin/commandes/${o.reference}`} className="whitespace-nowrap font-semibold text-link hover:underline">
                    {o.reference}
                  </Link>
                  <p className="text-xs text-muted">{dateTime(o.createdAt)}</p>
                </td>
                <td className={td}>
                  <p className="whitespace-nowrap font-semibold">{o.customerName}</p>
                  <p className="text-xs text-muted">{o.city}</p>
                </td>
                {!compact && <td className={`${td} tabular-nums`}>{units}</td>}
                {!compact && (
                  <td className={td}>
                    <StatusLabel tone={pay.tone}>{pay.label}</StatusLabel>
                    <p className="text-xs text-muted">{paymentMethod(o.paymentMethod)}</p>
                  </td>
                )}
                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{formatFCFA(o.totalXof)}</td>
                <td className={td}>
                  <StatusLabel tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</StatusLabel>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableScroll>
  );
}
