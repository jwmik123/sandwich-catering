/**
 * Moves the delivery zones from app/assets/postals.js into the Sanity
 * "deliveryZones" singleton, so the client can edit postcodes and costs in the
 * Studio. One-off: postals.js was removed afterwards (see git history).
 *
 * postals.js listed some postcodes twice; JavaScript kept the last value, so
 * that is what the order form charged and what is migrated here. Regular
 * zones were free from €150, "alwaysCharge" zones always charged ("minOrder"
 * was never used).
 *
 * Read-only: node scripts/migrate-delivery-zones.js
 * Apply:     node scripts/migrate-delivery-zones.js --fix
 */

import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { postalCodeDeliveryCosts } from "../app/assets/postals.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local"), quiet: true });

const FIX = process.argv.includes("--fix");
const FREE_DELIVERY_FROM = 150;

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
});

const groups = new Map();
for (const [postcode, zone] of Object.entries(postalCodeDeliveryCosts)) {
  const cost = typeof zone === "number" ? zone : zone.cost;
  const alwaysCharge = typeof zone === "object" && !!zone.alwaysCharge;
  const key = `${cost}-${alwaysCharge}`;
  if (!groups.has(key)) groups.set(key, { cost, alwaysCharge, postcodes: [] });
  groups.get(key).postcodes.push(postcode);
}

const euro = (n) => `€${n.toFixed(2).replace(".", ",")}`;
const zones = [...groups.values()]
  .sort((a, b) => a.alwaysCharge - b.alwaysCharge || a.cost - b.cost)
  .map((g, i) => ({
    _key: `zone${i + 1}`,
    _type: "deliveryZone",
    label: `Zone ${euro(g.cost)}${g.alwaysCharge ? " (always charged)" : ""}`,
    cost: g.cost,
    ...(g.alwaysCharge ? {} : { freeDeliveryFrom: FREE_DELIVERY_FROM }),
    postcodes: g.postcodes.sort(),
  }));

for (const z of zones) console.log(`${z.label}: ${z.postcodes.length} postcodes\n  ${z.postcodes.join(" ")}`);
console.log(`Total: ${zones.reduce((n, z) => n + z.postcodes.length, 0)} postcodes`);

const existing = await sanity.fetch(`*[_id in ["deliveryZones", "drafts.deliveryZones"]]._id`);
if (existing.length) {
  console.log(`\nAlready in Sanity (${existing.join(", ")}); not touching it.`);
} else if (FIX) {
  await sanity.create({ _id: "deliveryZones", _type: "deliveryZones", zones });
  console.log("\nCreated deliveryZones in Sanity.");
} else {
  console.log("\nRead-only. Run with --fix to create the document in Sanity.");
}
