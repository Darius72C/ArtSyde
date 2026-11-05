import "server-only";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { auth, linkCustomer } from "@/server/auth";

/** The signed-in customer's account, or null. Reads the session cookie: call it inside a request. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return session?.user ?? null;
}

/** The customer linked to the signed-in account (created and linked if the sign-up hook missed it), or null. */
export async function getMyCustomer() {
  const user = await getSessionUser();
  if (!user) return null;
  let customer = await db.customer.findUnique({ where: { userId: user.id } });
  if (!customer) {
    await linkCustomer(user);
    customer = await db.customer.findUnique({ where: { userId: user.id } });
  }
  return customer ? { user, customer } : null;
}

/**
 * The customer an order or a credit purchase belongs to: the signed-in customer (who gets the phone typed in,
 * if they had none and no other customer has it), else the customer already known by that phone, else none.
 */
export async function customerFor(phone: string): Promise<string | null> {
  const me = await getMyCustomer().catch(() => null);
  if (me) {
    if (!me.customer.phone && phone && !(await db.customer.findUnique({ where: { phone }, select: { id: true } })))
      await db.customer.update({ where: { id: me.customer.id }, data: { phone } }).catch(() => {});
    return me.customer.id;
  }
  const known = phone ? await db.customer.findUnique({ where: { phone }, select: { id: true } }) : null;
  return known?.id ?? null;
}

/** A customer's studio credits: the sum of their ledger. */
export async function creditBalance(customerId: string) {
  const sum = await db.creditEntry.aggregate({ where: { customerId }, _sum: { amount: true } });
  return sum._sum.amount ?? 0;
}
