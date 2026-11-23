// Lists the French texts wrapped in t("…") that have no English in src/lib/i18n/en.ts. Usage: node scripts/i18n-check.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const en = readFileSync("src/lib/i18n/en.ts", "utf8");
const keys = new Set();
for (const m of en.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*:/gm)) keys.add(JSON.parse(m[1]));
const missing = new Map();
for (const f of walk("src").filter((f) => /\.(tsx?|mjs)$/.test(f) && !f.includes("/admin/") && !f.includes("generated"))) {
  const src = readFileSync(f, "utf8");
  if (!/lib\/i18n|useT\(\)|getT\(\)|getRequestT\(\)|makeT\(|pageMetadata\(/.test(src)) continue; // files on the site's i18n (the emails have their own t())
  for (const m of src.matchAll(/\b(?:t|tr|pageMetadata)\(\s*("(?:[^"\\]|\\.)*")/g)) {
    const k = JSON.parse(m[1]);
    if (!keys.has(k)) missing.set(k, f);
  }
}
for (const [k, f] of missing) console.log(`${f}\t${JSON.stringify(k)}`);
console.error(`${missing.size} missing`);
process.exit(missing.size ? 1 : 0);
