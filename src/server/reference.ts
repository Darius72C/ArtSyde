import "server-only";
import { randomInt } from "node:crypto";

/*
 * References given to customers: "AS-7KP3-QX9M" for an order, "CR-…" for a credit purchase.
 *
 * Random, not numbered: a numbered reference (AS-2611-0143) gives away all the others, so with a phone number
 * someone could try every order of the month on the tracking page and find a person's address; and it shows
 * competitors how many orders the shop gets. 8 characters from 31 give about 850 billion references.
 * Characters that are easily mixed up when read out or copied (0 and O, 1, I and L) are left out.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A new random reference with this prefix ("AS" or "CR"). Uniqueness is the database's job (unique index). */
export function randomReference(prefix: "AS" | "CR") {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${prefix}-${pick()}-${pick()}`;
}

/**
 * A reference as a customer typed it, cleaned up: capitals, with or without spaces and dashes, and the look-alikes
 * they might type in an old numbered reference (O for 0, I or L for 1). Null when it can't be one of ours.
 */
export function cleanReference(raw: string, prefix: "AS" | "CR") {
  const s = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s.startsWith(prefix)) return null;
  const body = s.slice(prefix.length);
  // Before random references: "AS-2611-0143", digits only, still found.
  const numbered = body.replace(/O/g, "0").replace(/[IL]/g, "1");
  if (/^\d{8,}$/.test(numbered)) return `${prefix}-${numbered.slice(0, 4)}-${numbered.slice(4)}`;
  if (/^[A-Z2-9]{8}$/.test(body)) return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
  return null;
}
