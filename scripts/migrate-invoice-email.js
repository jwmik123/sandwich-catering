/**
 * Splits legacy comma-separated e-mail fields into a contact address and a
 * separate invoice address.
 *
 * Customers used to cram two addresses into one field ("tessa@x.nl, info@x.nl")
 * because there was nowhere else to put the finance address. Yuki accepts one
 * address only and rejected those invoices outright, so the split is now an
 * explicit field. This backfills it for existing orders.
 *
 * Heuristic: the address whose local part looks like a finance mailbox
 * (facturen@, invoices@, finance@, administratie@, ap@, …) becomes the invoice
 * address; the other stays the contact. When neither or both look like finance,
 * the SECOND address is taken as the invoice address — that is what customers
 * did in practice — and the row is marked "review" so a human confirms.
 *
 * Read-only:      node scripts/migrate-invoice-email.js
 * Export to file: node scripts/migrate-invoice-email.js --out plan.tsv
 * Apply (all):    node scripts/migrate-invoice-email.js --fix
 * Apply (safe):   node scripts/migrate-invoice-email.js --fix --confident
 */

import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local"), quiet: true });

const FIX = process.argv.includes("--fix");
// Only touch rows where a finance mailbox was recognised (the "✓" rows).
const CONFIDENT_ONLY = process.argv.includes("--confident");
// Write the full plan to a tab-separated file for review in a spreadsheet.
const outFlag = process.argv.indexOf("--out");
const OUT_FILE = outFlag > -1 ? process.argv[outFlag + 1] : null;

for (const key of ["NEXT_PUBLIC_SANITY_PROJECT_ID", "NEXT_PUBLIC_SANITY_DATASET"]) {
  if (!process.env[key]) {
    console.error(`❌ Missing ${key} in .env.local`);
    process.exit(1);
  }
}

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
});

const FINANCE_PATTERNS = [
  "factu", "invoice", "finance", "financi", "administrat", "boekhoud",
  "crediteur", "accounts", "ap@", "p2p", "debiteur", "billing",
];

const looksLikeFinance = (email) => {
  const local = String(email).split("@")[0].toLowerCase();
  const full = String(email).toLowerCase();
  return FINANCE_PATTERNS.some((p) => local.includes(p) || full.startsWith(p));
};

const split = (raw) => {
  const parts = String(raw || "")
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const finance = parts.filter(looksLikeFinance);
  const rest = parts.filter((p) => !looksLikeFinance(p));

  if (finance.length === 1 && rest.length >= 1) {
    return { contact: rest.join(", "), invoice: finance[0], confident: true };
  }
  // Ambiguous: fall back to "second address is the invoice address".
  return { contact: parts[0], invoice: parts[1], confident: false };
};

const run = async () => {
  const invoices = await sanity.fetch(
    `*[_type == "invoice" && defined(orderDetails.email) && !defined(orderDetails.invoiceEmail)]{
      _id, invoiceNumber, "email": orderDetails.email,
      "customer": coalesce(companyDetails.name, orderDetails.name)
    } | order(invoiceNumber asc)`
  );
  const quotes = await sanity.fetch(
    `*[_type == "quote" && defined(email) && !defined(invoiceEmail)]{
      _id, quoteId, email, name
    } | order(quoteId asc)`
  );

  const plan = [];
  for (const doc of invoices) {
    const s = split(doc.email);
    if (s) plan.push({ ...doc, ...s, type: "invoice", label: doc.invoiceNumber });
  }
  for (const doc of quotes) {
    const s = split(doc.email);
    if (s) plan.push({ ...doc, ...s, type: "quote", label: doc.quoteId, customer: doc.name });
  }

  console.log(
    `Scanned ${invoices.length} invoices and ${quotes.length} quotes.\n${plan.length} document(s) hold more than one address:\n`
  );
  for (const p of plan) {
    console.log(
      `${p.confident ? "✓" : "?"} ${p.type.padEnd(7)} ${String(p.label).padEnd(14)} ${p.customer || "—"}`
    );
    console.log(`     from:    ${p.email}`);
    console.log(`     contact: ${p.contact}`);
    console.log(`     invoice: ${p.invoice}`);
  }

  const unsure = plan.filter((p) => !p.confident);
  if (unsure.length) {
    console.log(
      `\n⚠️  ${unsure.length} marked "?" — no obvious finance mailbox, so the second address was assumed. Check these before applying.`
    );
  }

  if (OUT_FILE) {
    const rows = [
      ["confident", "type", "id", "customer", "original", "contact", "invoice"].join("\t"),
      ...plan.map((p) =>
        [p.confident ? "yes" : "review", p.type, p.label, p.customer || "", p.email, p.contact, p.invoice].join("\t")
      ),
    ];
    writeFileSync(OUT_FILE, rows.join("\n"));
    console.log(`\n📄 Plan written to ${OUT_FILE} (${plan.length} rows).`);
  }

  const target = CONFIDENT_ONLY ? plan.filter((p) => p.confident) : plan;

  if (!FIX) {
    console.log(
      `\nRun with --fix to apply${CONFIDENT_ONLY ? "" : " (add --confident to skip the ? rows)"}. Nothing was changed.`
    );
    return;
  }

  console.log(
    `\nApplying to ${target.length} document(s)${CONFIDENT_ONLY ? " (confident only)" : ""}…`
  );
  for (const p of target) {
    const patch = sanity.patch(p._id);
    if (p.type === "invoice") {
      patch.set({
        "orderDetails.email": p.contact,
        "orderDetails.invoiceEmail": p.invoice,
      });
    } else {
      patch.set({ email: p.contact, invoiceEmail: p.invoice });
    }
    await patch.commit();
    console.log(`migrated ${p.type} ${p.label}`);
  }
  console.log(`\n✅ Migrated ${target.length} document(s).`);
};

run().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
