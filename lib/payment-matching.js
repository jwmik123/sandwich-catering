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

// Amounts are compared in whole cents; one cent covers rounding in Yuki.
const TOLERANCE_CENTS = 1;
const cents = (n) => Math.round(Number(n || 0) * 100);
const EARLY_PAYMENT_DAYS = 3;
const DAY_MS = 86400000;

const INVOICE_NUMBER_RE = /CAT-\d{4}-\d{4}/gi;
// Quote ids are "Q" + 8 lowercase alphanumerics (see generateQuote).
const QUOTE_ID_RE = /\bQ[a-z0-9]{8}\b/g;

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
 * @returns {Map<string, {date, amount, contact, method, documentId, partial}>}
 *   invoiceNumber -> the receipt that pays it. `partial` is set when the
 *   receipt covers less than the open amount (e.g. a stray "paid too much"
 *   remainder that quotes the invoice).
 */
export function matchReceiptsToInvoices(receipts, invoices) {
  const matches = new Map();
  const usedReceipts = new Set();

  const byNumber = new Map(invoices.map((i) => [i.invoiceNumber, i]));
  const byQuote = new Map(
    invoices.filter((i) => i.quoteId).map((i) => [i.quoteId, i])
  );

  const assign = (invoice, receipt, method) => {
    matches.set(invoice.invoiceNumber, {
      date: receipt.date,
      amount: receipt.amount,
      contact: receipt.contact,
      method,
      documentId: receipt.documentId,
      partial: cents(receipt.amount) + TOLERANCE_CENTS < cents(invoice.openAmount),
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

  return matches;
}
