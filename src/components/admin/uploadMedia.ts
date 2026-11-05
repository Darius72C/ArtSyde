"use client";

import { addPhoto, presignPhoto } from "@/server/admin/products";

/**
 * Uploads one picture of a product: signed by the server, sent straight from the browser to R2,
 * then added to the product's photos or flat mockups. Throws an Error whose message is for the admin.
 * Used by PhotoManager (an existing product) and ProductForm (photos picked while creating one).
 */
export async function uploadMedia(productId: string, file: File, kind: "photos" | "flats") {
  const signed = await presignPhoto(productId, { type: file.type, size: file.size }, kind);
  if (!signed.ok) throw new Error(signed.message);
  const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": signed.contentType }, body: file }).catch(() => null);
  if (!put?.ok) throw new Error(`L'envoi vers le stockage a échoué${put ? ` (${put.status})` : ""}. Vérifie la règle CORS du bucket.`);
  const added = await addPhoto(productId, signed.publicUrl, kind);
  if (!added.ok) throw new Error(added.message);
}
