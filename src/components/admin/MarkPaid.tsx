"use client";

import { useActionState } from "react";
import { markPurchasePaid, type MarkPaidState } from "@/server/admin/purchases";

/** "Marquer payé" for one credit purchase; the spinner is the shop's (LoginView, CheckoutView). */
export function MarkPaid({ id, label }: { id: string; label: string }) {
  const [state, action, pending] = useActionState<MarkPaidState, FormData>(markPurchasePaid, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} aria-label={`Marquer payé : ${label}`} className="btn whitespace-nowrap !px-4 !py-1.5 !text-[14px]">
        {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : "Marquer payé"}
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
