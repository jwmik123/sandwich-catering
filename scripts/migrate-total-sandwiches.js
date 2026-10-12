/**
 * Turns orderDetails.totalSandwiches stored as a string ("25") into a number
 * on invoices and quotes, drafts included.
 *
 * The quantity input handed the value over as a string once the customer typed
 * in it, while the schema says number. The Studio then refused to publish such
 * a document ("Expected type Number, got String"). The writers now store a
 * number; this fixes what was already stored. Only the type changes, never the
 * value, so nothing billed or booked is affected.
 *
 * Read-only: node scripts/migrate-total-sandwiches.js
 * Apply:     node scripts/migrate-total-sandwiches.js --fix
 */

import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local"), quiet: true });

const FIX = process.argv.includes("--fix");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
});

const docs = await sanity.fetch(
  `*[_type in ["invoice", "quote"] && string(orderDetails.totalSandwiches) == orderDetails.totalSandwiches]{
    _id, _type, "value": orderDetails.totalSandwiches
  }`
);

const fixable = [];
const skipped = [];
for (const d of docs) {
  const n = Number(String(d.value).trim());
  if (String(d.value).trim() !== "" && Number.isFinite(n)) fixable.push({ ...d, n });
  else skipped.push(d);
}

const count = (type) => fixable.filter((d) => d._type === type).length;
console.log(`String totalSandwiches: ${docs.length} (invoices ${count("invoice")}, quotes ${count("quote")} fixable)`);
for (const d of skipped) console.log(`  skip ${d._id}: ${JSON.stringify(d.value)} is not a number`);

if (!FIX) {
  console.log("Read-only. Run with --fix to convert.");
  process.exit(0);
}

const BATCH = 100;
for (let i = 0; i < fixable.length; i += BATCH) {
  const tx = sanity.transaction();
  for (const d of fixable.slice(i, i + BATCH)) {
    // ifRevisionID-free on purpose: only this one field is set, to the same value.
    tx.patch(d._id, (p) => p.set({ "orderDetails.totalSandwiches": d.n }));
  }
  await tx.commit({ visibility: "async" });
  console.log(`  converted ${Math.min(i + BATCH, fixable.length)}/${fixable.length}`);
}
console.log("Done.");
