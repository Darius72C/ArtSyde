/**
 * The studio's draft, kept in this browser (IndexedDB: the imported images are large data URLs) so a design
 * comes back after a reload or a later visit. Never sent anywhere; a saved creation lives in the account.
 */
const DB = "artsyde", STORE = "studio", KEY = "draft";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveDraft<T>(draft: T): Promise<void> {
  try {
    await run("readwrite", (s) => s.put(draft, KEY));
  } catch {
    // storage full or blocked (private window): the draft just isn't kept
  }
}

export async function loadDraft<T>(): Promise<T | null> {
  try {
    return ((await run("readonly", (s) => s.get(KEY))) as T | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    // nothing kept anyway
  }
}
