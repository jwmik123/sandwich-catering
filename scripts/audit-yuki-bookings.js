/**
 * Audits every invoice that Sanity believes was sent to Yuki against Yuki
 * itself. Invoices booked before the verification fix carry no `yukiVerifiedAt`,
 * so absence from Yuki's open-debtor list was silently read as "paid" — this
 * finds those.
 *
 * A booked invoice is proven by either:
 *   - being an outstanding debtor item now (unpaid), or
 *   - having a revenue (80001) transaction for the same contact on the invoice
 *     date (paid and already settled).
 *
 * Read-only by default:   node scripts/audit-yuki-bookings.js
 * Flag suspects in Sanity: node scripts/audit-yuki-bookings.js --fix
 */

import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { parseStringPromise } from "xml2js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const FIX = process.argv.includes("--fix");
const BASE_URL = "https://api.yukiworks.nl/ws";

const required = [
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET",
  "YUKI_API_KEY",
  "YUKI_ADMINISTRATION_ID",
];
for (const key of required) {
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

async function soap(service, action, body) {
  const res = await fetch(`${BASE_URL}/${service}.asmx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8",
      SOAPAction: `"http://www.theyukicompany.com/${action}"`,
    },
    body: `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>${body}</soap12:Body></soap12:Envelope>`,
  });
  const xml = await res.text();
  if (!res.ok) throw new Error(`${action} ${res.status}: ${xml.slice(0, 400)}`);
  return parseStringPromise(xml);
}

const run = async () => {
  const auth = await soap(
    "Sales",
    "Authenticate",
    `<Authenticate xmlns="http://www.theyukicompany.com/"><accessKey>${process.env.YUKI_API_KEY}</accessKey></Authenticate>`
  );
  const sessionId =
    auth["soap:Envelope"]["soap:Body"][0].AuthenticateResponse[0]
      .AuthenticateResult[0];

  // Open items (unpaid but booked).
  const openRes = await soap(
    "Accounting",
    "OutstandingDebtorItems",
    `<OutstandingDebtorItems xmlns="http://www.theyukicompany.com/"><sessionID>${sessionId}</sessionID><administrationID>${process.env.YUKI_ADMINISTRATION_ID}</administrationID><includeBankTransactions>false</includeBankTransactions><sortOrder>DateDesc</sortOrder></OutstandingDebtorItems>`
  );
  const openItems =
    openRes["soap:Envelope"]["soap:Body"][0].OutstandingDebtorItemsResponse[0]
      .OutstandingDebtorItemsResult[0].OutstandingDebtorItems[0].Item || [];
  const openRefs = new Set(
    openItems.map((i) => String(i.Reference?.[0] || "").trim())
  );

  // Revenue ledger (booked, including already-paid invoices).
  const glRes = await soap(
    "Accounting",
    "GLAccountTransactions",
    `<GLAccountTransactions xmlns="http://www.theyukicompany.com/"><sessionID>${sessionId}</sessionID><administrationID>${process.env.YUKI_ADMINISTRATION_ID}</administrationID><GLAccountCode>80001</GLAccountCode><StartDate>2024-01-01T00:00:00</StartDate><EndDate>${new Date().toISOString().slice(0, 10)}T00:00:00</EndDate></GLAccountTransactions>`
  );
  const txs =
    glRes["soap:Envelope"]["soap:Body"][0].GLAccountTransactionsResponse[0]
      .GLAccountTransactionsResult[0].GLAccountTransactions[0]
      .GLAccountTransaction || [];
  // Ledger rows carry no invoice reference, so a booking is matched on its
  // contact name and/or its net amount within a window around the invoice date.
  const normalizeName = (name) =>
    String(name || "")
      .toLowerCase()
      .replace(/\b(b\.?v\.?|n\.?v\.?|stichting|holding|group|bank)\b/g, "")
      .replace(/[^a-z0-9]/g, "");

  // Sum the per-line revenue rows into one net amount per contact per date.
  const bookings = new Map(); // "contact|date" -> { name, date, net }
  for (const t of txs) {
    const name = t.Contact?.[0] || "";
    const date = t.Date[0];
    const key = `${normalizeName(name)}|${date}`;
    const entry = bookings.get(key) || { name: normalizeName(name), date, net: 0 };
    // Revenue is booked as a credit (negative) on 80001.
    entry.net += Math.abs(parseFloat(t.Amount?.[0] || "0"));
    bookings.set(key, entry);
  }
  const bookingList = [...bookings.values()];

  const DAY = 86400000;
  const WINDOW_DAYS = 7;
  const isBookedInLedger = (inv) => {
    const invDate = inv.invoiceDate ? new Date(inv.invoiceDate).getTime() : null;
    const wanted = inv.customer ? normalizeName(inv.customer) : "";
    // Net of 9% VAT — what lands on the revenue account.
    const net = inv.total ? inv.total / 1.09 : null;
    return bookingList.some((b) => {
      if (invDate !== null) {
        const gap = Math.abs(new Date(b.date).getTime() - invDate);
        if (gap > WINDOW_DAYS * DAY) return false;
      }
      const nameHit =
        wanted &&
        b.name &&
        (b.name.includes(wanted) || wanted.includes(b.name));
      const amountHit = net !== null && Math.abs(b.net - net) < 0.5;
      return nameHit || amountHit;
    });
  };

  const invoices = await sanity.fetch(
    `*[_type == "invoice" && yukiSent == true && defined(invoiceNumber)]{
      _id, invoiceNumber, status, yukiVerifiedAt, yukiMissing,
      "customer": coalesce(companyDetails.name, orderDetails.name),
      "email": orderDetails.email,
      "invoiceDate": orderDetails.deliveryDate,
      "total": amount.total
    } | order(invoiceNumber asc)`
  );

  const suspects = [];
  for (const inv of invoices) {
    const ref = String(inv.invoiceNumber).trim();
    if (openRefs.has(ref) || inv.yukiVerifiedAt) continue;
    if (isBookedInLedger(inv)) continue;
    suspects.push(inv);
  }

  console.log(
    `Checked ${invoices.length} invoices marked as sent to Yuki. ${openRefs.size} open in Yuki, ${txs.length} revenue lines.`
  );
  console.log(`\n🚨 ${suspects.length} invoice(s) with no trace in Yuki:\n`);
  let sum = 0;
  for (const s of suspects) {
    sum += s.total || 0;
    console.log(
      `${s.invoiceNumber}  €${(s.total || 0).toFixed(2).padStart(9)}  ${s.status.padEnd(8)}  ${s.customer || "—"}  |  ${s.email || "—"}`
    );
  }
  console.log(`\nTotal at risk: €${sum.toFixed(2)}`);

  if (!FIX) {
    console.log("\nRun with --fix to flag these in Sanity (status untouched).");
    return;
  }

  for (const s of suspects) {
    await sanity
      .patch(s._id)
      .set({
        yukiMissing: true,
        yukiError:
          "Audit: no trace in Yuki (not an outstanding item, no revenue booking). Invoice probably never reached Yuki.",
      })
      .commit();
    console.log(`flagged ${s.invoiceNumber}`);
  }
  console.log(`\n✅ Flagged ${suspects.length} invoice(s) as missing in Yuki.`);
};

run().catch((e) => {
  console.error("❌ Audit failed:", e);
  process.exit(1);
});
