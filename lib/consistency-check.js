// Weekly Sanity <-> Yuki consistency check (Monday morning).
//
// Every failure found so far left a trace somewhere nobody looked: an HTTP 200
// hiding a rejection, an absence read as "paid", a warning in the server log.
// This turns all of those into one list, checked every week, so a problem is
// known on Monday instead of when a customer calls.
//
// Pure: takes the merged overview (lib/invoice-overview.js), returns findings.
import { VERIFICATION_ROLLOUT_AT } from "@/lib/yuki-api";

// Findings someone has to act on — the data or the integration is wrong.
export const ACTION = "action";
// Bookkeeping to-do — nothing is broken, Yuki just needs a hand.
export const BOOKKEEPING = "bookkeeping";

// Adjustment lines are reported once, in the run after they were booked.
const RECENT_MS = 36 * 3600 * 1000;

const euro = (n) =>
  typeof n === "number" ? `€${n.toFixed(2).replace(".", ",")}` : "—";
// "2026-09-30" -> "30-9-2026"
const datum = (d) =>
  /^\d{4}-\d{2}-\d{2}/.test(d || "")
    ? d.slice(0, 10).split("-").reverse().map((p, i) => (i < 2 ? String(+p) : p)).join("-")
    : d || "—";

/**
 * @param {{yukiError, rows, orphans, openCredits}} overview
 * @param {Date} [now]
 * @returns {Array<{kind, severity, invoiceNumber, customer, detail}>}
 */
export function findInconsistencies({ yukiError, rows, orphans, openCredits }, now = new Date()) {
  const findings = [];
  const add = (kind, severity, row, detail) =>
    findings.push({
      kind,
      severity,
      invoiceNumber: row?.invoiceNumber || null,
      customer: row?.customer || null,
      detail,
    });

  if (yukiError) {
    // Without Yuki every other check is blind — report only this.
    add("yuki_unreachable", ACTION, null, `Yuki kon niet worden gelezen (${yukiError}). De rest van de controle is overgeslagen.`);
    return findings;
  }

  const today = now.toISOString().slice(0, 10);
  const rollout = VERIFICATION_ROLLOUT_AT.toISOString().slice(0, 10);

  for (const r of rows) {
    if (r.status === "cancelled") continue;

    // Should have been booked by now: invoices are booked on the delivery date.
    // Only checked from the rollout on; older unsent invoices are known history.
    if (
      !r.yukiSent &&
      r.deliveryDate &&
      r.deliveryDate >= rollout &&
      r.deliveryDate < today
    ) {
      add(
        "not_booked",
        ACTION,
        r,
        r.yukiError
          ? `Niet in Yuki geboekt. Foutmelding: ${r.yukiError}`
          : `Geleverd op ${datum(r.deliveryDate)}, nog niet in Yuki geboekt.`
      );
    }

    if (r.missingInYuki) {
      add("missing_in_yuki", ACTION, r, "Staat als verstuurd, maar Yuki heeft hem nooit geboekt.");
    }

    // Booked after verification existed, yet never verified: something set
    // yukiSent outside createYukiInvoice (e.g. by hand in the Studio).
    if (
      r.yukiSent &&
      !r.verifiedInYuki &&
      r.yukiSentAt &&
      new Date(r.yukiSentAt) >= VERIFICATION_ROLLOUT_AT &&
      !r.openInYuki
    ) {
      add("unverified", ACTION, r, "Staat als verstuurd, maar is nooit in Yuki teruggevonden.");
    }

    if (r.amountMismatch) {
      add(
        "amount_mismatch",
        ACTION,
        r,
        `Yuki: ${euro(r.yukiAmount)}, factuur: ${euro(r.total)}. Corrigeer in Yuki.`
      );
    }

    if (
      r.yukiAmountCorrection &&
      r.yukiSentAt &&
      now - new Date(r.yukiSentAt) < RECENT_MS
    ) {
      add(
        "adjusted",
        ACTION,
        r,
        `Geboekt met een correctieregel van ${euro(r.yukiAmountCorrection)}: de bestelregels kwamen niet uit op het factuurbedrag. Controleer de bestelling.`
      );
    }

    // Online payments: the invoice must state what Mollie actually collected.
    if (
      typeof r.paidAmount === "number" &&
      typeof r.total === "number" &&
      Math.abs(r.paidAmount - r.total) > 0.01
    ) {
      add(
        "paid_amount_mismatch",
        ACTION,
        r,
        `Klant betaalde ${euro(r.paidAmount)} online, de factuur is ${euro(r.total)}.`
      );
    }

    if (r.mismatch) {
      add(
        "status_mismatch",
        ACTION,
        r,
        `Betaald volgens Sanity, maar in Yuki staat nog ${euro(r.openAmount)} open en er is geen betaling gevonden.`
      );
    }

    if (r.paymentReceived?.partial) {
      add(
        "partial_payment",
        BOOKKEEPING,
        r,
        `${euro(r.paymentReceived.amount)} ontvangen op ${datum(r.paymentReceived.date)} met dit factuurnummer, ${euro(r.owed)} verschuldigd. Controleer dit voor je een herinnering stuurt.`
      );
    } else if (r.paymentReceived) {
      add(
        "paid_not_linked",
        BOOKKEEPING,
        r,
        r.paymentReceived.method === "batch"
          ? `Betaald in één overboeking van ${euro(r.paymentReceived.amount)} van ${r.paymentReceived.contact} op ${datum(r.paymentReceived.date)}, samen met: ${r.paymentReceived.batchWith.filter((n) => n !== r.invoiceNumber).join(", ")}. Koppel in Yuki.`
          : `${euro(r.paymentReceived.amount)} ontvangen van ${r.paymentReceived.contact} op ${datum(r.paymentReceived.date)}. Koppel in Yuki.`
      );
    }
  }

  for (const o of orphans || []) {
    add(
      "orphan",
      ACTION,
      { invoiceNumber: o.invoiceNumber },
      `Staat open in Yuki (${euro(o.openAmount)}), maar deze factuur bestaat niet in Sanity.`
    );
  }

  for (const c of openCredits || []) {
    if (!c.invoiceNumber) {
      add(
        "orphan_credit",
        ACTION,
        { invoiceNumber: c.creditNoteNumber, customer: c.contact },
        `Creditnota staat open in Yuki (−${euro(Math.abs(c.openAmount))}), maar bestaat niet in Sanity.`
      );
      continue;
    }
    add(
      "credit_not_linked",
      BOOKKEEPING,
      { invoiceNumber: c.invoiceNumber, customer: c.contact },
      `Gecrediteerd met ${c.creditNoteNumber} (−${euro(Math.abs(c.openAmount))}). Boek die twee in Yuki tegen elkaar weg.`
    );
  }

  return findings;
}

export const KIND_LABELS = {
  yuki_unreachable: "Yuki niet bereikbaar",
  not_booked: "Niet geboekt in Yuki",
  missing_in_yuki: "Ontbreekt in Yuki",
  unverified: "Niet teruggevonden in Yuki",
  amount_mismatch: "Bedrag in Yuki klopt niet",
  adjusted: "Geboekt met correctieregel",
  status_mismatch: "Betaald in Sanity, open in Yuki",
  paid_amount_mismatch: "Online betaald bedrag wijkt af",
  orphan: "In Yuki, niet in Sanity",
  partial_payment: "Deels betaald",
  paid_not_linked: "Betaald, nog niet gekoppeld in Yuki",
  orphan_credit: "Creditnota in Yuki, niet in Sanity",
  credit_not_linked: "Creditnota nog niet weggeboekt",
};
