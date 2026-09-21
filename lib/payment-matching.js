// Matches bank receipts that Yuki has not yet linked to an invoice against our
// open invoices.
//
// Yuki only marks an invoice paid once the bookkeeper matches the bank line to
// it. Until then the invoice stays "open" even though the money arrived — and a
// reminder for it is wrong. Yuki does list those unmatched receipts (as
// negative outstanding items), with the payer's remittance text, so we can tell
// the invoice is paid well before the bookkeeping catches up.
//
// Two passes, strongest evidence first; each receipt and invoice is used once:
//   1. reference — the remittance text names our invoice number
//      ("CAT-2026-0061") or quote id ("Order Qnn48sgxx", "Invoice ID: Qdce9bli7")
//   2. amount + name — same amount to the cent, payer name overlaps the
//      customer name, paid no earlier than a few days before the invoice date
//      (never for payment-provider receipts, see isPaymentProviderReceipt)
//   3. combined payment — one receipt paying several invoices of one customer
//      ("ZIE BETALINGSSPECIFICATIE NR ..."): accepted only when exactly one
//      combination of that customer's open items adds up to the cent

// Amounts are compared in whole cents; one cent covers rounding in Yuki.
const TOLERANCE_CENTS = 1;
const cents = (n) => Math.round(Number(n || 0) * 100);
const EARLY_PAYMENT_DAYS = 3;
const DAY_MS = 86400000;

const INVOICE_NUMBER_RE = /CAT-\d{4}-\d{4}/gi;
// Quote ids are "Q" + 8 lowercase alphanumerics (see generateQuote).
const QUOTE_ID_RE = /\bQ[a-z0-9]{8}\b/g;

// Online payments arrive from the payment provider Mollie, on Yuki contact
// "Mollie", with a transaction id ("Order Qnn48sgxx tr_C2nEcKvf..."). The
// payer is whichever customer placed that order — not Mollie BV, which is
// itself also a catering customer. Such receipts may only be matched by the
// quote id / invoice number they carry, never by amount and payer name.
const PAYMENT_PROVIDER_TX_RE = /\btr_[A-Za-z0-9]{6,}/;

export const isPaymentProviderReceipt = (receipt) =>
  PAYMENT_PROVIDER_TX_RE.test(receipt?.description || "");

// Words that say nothing about who a company is.
const NAME_STOPWORDS = new Set([
  "bv", "nv", "vof", "stichting", "stg", "holding", "group", "groep", "the",
  "de", "het", "van", "en", "and", "amsterdam", "nederland", "netherlands",
  "international", "europe", "bank", "studio", "studios",
]);

const nameTokens = (name) =>
  new Set(
    String(name || "")
      .toLowerCase()
      .replace(/b\.v\.|n\.v\./g, " ")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !NAME_STOPWORDS.has(w))
  );

// SEPA remittance text carries the payer's own name after IBAN and BIC:
// "/CNTP/NL76INGB0007358236/INGBNL2A/Dentsu Creative Amsterdam B.V.///REMI/..."
// Yuki may file the receipt under a person ("Romy de Vocht"); this is the company.
const payerNameFromDescription = (description) =>
  (String(description || "").match(/\/CNTP\/[^/]*\/[^/]*\/([^/]+)\//) || [])[1] || "";

// Combined payments: search limits.
const BATCH_MAX_POOL = 18;
const BATCH_MIN_ITEMS = 2;

/**
 * All subsets of `pool` (items with `.c` cents) summing to `target`, stopping
 * after `limit` solutions. Pool is sorted descending so overshoot prunes early.
 */
function subsetsSummingTo(pool, target, limit) {
  const solutions = [];
  const sorted = [...pool].sort((a, b) => b.c - a.c);
  const suffix = new Array(sorted.length + 1).fill(0);
  for (let i = sorted.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + sorted[i].c;
  const walk = (idx, sum, picked) => {
    if (solutions.length >= limit) return;
    if (sum === target) {
      if (picked.length >= BATCH_MIN_ITEMS) solutions.push(picked);
      return;
    }
    if (idx >= sorted.length || sum > target || sum + suffix[idx] < target) return;
    walk(idx + 1, sum + sorted[idx].c, [...picked, sorted[idx]]);
    walk(idx + 1, sum, picked);
  };
  walk(0, 0, []);
  return solutions;
}

const namesOverlap = (a, b) => {
  const ta = nameTokens(a);
  for (const t of nameTokens(b)) if (ta.has(t)) return true;
  return false;
};

/**
 * @param {Array<{documentId, date, amount, contact, description}>} receipts
 *   Unmatched bank receipts; `amount` is positive (money received).
 * @param {Array<{invoiceNumber, quoteId, customer, openAmount, date}>} invoices
 *   Invoices Yuki still reports open; `openAmount` is what the customer still
 *   owes against the invoice they received.
 * @param {Array<{reference, customer, openAmount, date}>} [otherOpenItems]
 *   Open items in Yuki that are not invoices of ours (older or manual
 *   invoices). They can be part of a combined payment, so they take part in
 *   pass 3, but never get a match entry themselves.
 * @returns {Map<string, {date, amount, contact, method, documentId, partial, batchWith}>}
 *   invoiceNumber -> the receipt that pays it. `partial` is set when the
 *   receipt covers less than the open amount (e.g. a stray "paid too much"
 *   remainder that quotes the invoice).
 */
export function matchReceiptsToInvoices(receipts, invoices, otherOpenItems = []) {
  const matches = new Map();
  const usedReceipts = new Set();

  const byNumber = new Map(invoices.map((i) => [i.invoiceNumber, i]));
  const byQuote = new Map(
    invoices.filter((i) => i.quoteId).map((i) => [i.quoteId, i])
  );

  const assign = (invoice, receipt, method, batchWith = null) => {
    matches.set(invoice.invoiceNumber, {
      date: receipt.date,
      amount: receipt.amount,
      contact: receipt.contact,
      method,
      documentId: receipt.documentId,
      partial: cents(receipt.amount) + TOLERANCE_CENTS < cents(invoice.openAmount),
      // For a combined payment: every item it pays, this invoice included.
      batchWith,
    });
    usedReceipts.add(receipt.documentId);
  };

  // Pass 1: the payer named the invoice. Several receipts may quote the same
  // invoice (a payment plus a "paid too much" remainder); keep the largest.
  const quoted = new Map(); // invoiceNumber -> receipts quoting it
  for (const r of receipts) {
    const text = r.description || "";
    const refs = [
      ...(text.match(INVOICE_NUMBER_RE) || []).map((m) => byNumber.get(m.toUpperCase())),
      ...(text.match(QUOTE_ID_RE) || []).map((m) => byQuote.get(m)),
    ].filter(Boolean);

    // A receipt naming several invoices (a batch payment) is left for a human.
    const distinct = [...new Set(refs)];
    if (distinct.length !== 1) continue;
    const key = distinct[0].invoiceNumber;
    quoted.set(key, [...(quoted.get(key) || []), r]);
  }
  for (const [invoiceNumber, rs] of quoted) {
    const best = rs.reduce((a, b) => (cents(b.amount) > cents(a.amount) ? b : a));
    assign(byNumber.get(invoiceNumber), best, "reference");
  }

  // Pass 2: same amount from a payer with a matching name. Oldest invoice
  // first, so a customer paying the same amount twice settles in order.
  const remaining = invoices
    .filter((i) => !matches.has(i.invoiceNumber))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  for (const invoice of remaining) {
    const invoiceTime = invoice.date ? new Date(invoice.date).getTime() : null;
    const candidates = receipts.filter((r) => {
      if (usedReceipts.has(r.documentId)) return false;
      if (isPaymentProviderReceipt(r)) return false;
      if (Math.abs(cents(r.amount) - cents(invoice.openAmount)) > TOLERANCE_CENTS)
        return false;
      if (!namesOverlap(r.contact, invoice.customer)) return false;
      if (invoiceTime !== null && r.date) {
        const earliest = invoiceTime - EARLY_PAYMENT_DAYS * DAY_MS;
        if (new Date(r.date).getTime() < earliest) return false;
      }
      return true;
    });
    if (!candidates.length) continue;
    candidates.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    assign(invoice, candidates[0], "amount+name");
  }

  // Pass 3: one receipt paying several invoices. Largest receipts first, so a
  // big combined payment claims its invoices before a smaller one can.
  const batchReceipts = receipts
    .filter((r) => !usedReceipts.has(r.documentId) && !isPaymentProviderReceipt(r))
    .sort((a, b) => b.amount - a.amount);
  const usedOther = new Set();

  for (const r of batchReceipts) {
    const payer = `${r.contact || ""} ${payerNameFromDescription(r.description)}`;
    const latest = r.date ? new Date(r.date).getTime() : null;
    const eligible = (item) => {
      if (!namesOverlap(payer, item.customer)) return false;
      // You cannot pay an invoice that does not exist yet.
      if (latest !== null && item.date && new Date(item.date).getTime() > latest)
        return false;
      return cents(item.openAmount) > 0 && cents(item.openAmount) < cents(r.amount);
    };

    const pool = [
      ...invoices
        .filter((i) => !matches.has(i.invoiceNumber) && eligible(i))
        .map((i) => ({ kind: "invoice", ref: i.invoiceNumber, item: i, c: cents(i.openAmount) })),
      ...otherOpenItems
        .filter((o) => !usedOther.has(o.reference) && eligible(o))
        .map((o) => ({ kind: "other", ref: o.reference, item: o, c: cents(o.openAmount) })),
    ];
    if (pool.length < BATCH_MIN_ITEMS || pool.length > BATCH_MAX_POOL) continue;

    // Exactly one combination, or we do not know what was paid.
    const solutions = subsetsSummingTo(pool, cents(r.amount), 2);
    if (solutions.length !== 1) continue;

    const refs = solutions[0].map((x) => x.ref);
    for (const x of solutions[0]) {
      if (x.kind === "invoice") assign(x.item, r, "batch", refs);
      else usedOther.add(x.ref);
    }
    usedReceipts.add(r.documentId);
  }

  return matches;
}
