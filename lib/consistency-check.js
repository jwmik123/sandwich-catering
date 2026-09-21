// Nightly Sanity <-> Yuki consistency check.
//
// Every failure found so far left a trace somewhere nobody looked: an HTTP 200
// hiding a rejection, an absence read as "paid", a warning in the server log.
// This turns all of those into one list, checked every night, so a problem is
// known the next morning instead of when a customer calls.
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

/**
 * @param {{yukiError, rows, orphans}} overview
 * @param {Date} [now]
 * @returns {Array<{kind, severity, invoiceNumber, customer, detail}>}
 */
export function findInconsistencies({ yukiError, rows, orphans }, now = new Date()) {
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
    add("yuki_unreachable", ACTION, null, `Yuki could not be read: ${yukiError}`);
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
          ? `Not booked in Yuki. Last error: ${r.yukiError}`
          : `Delivered ${r.deliveryDate}, not booked in Yuki yet.`
      );
    }

    if (r.missingInYuki) {
      add("missing_in_yuki", ACTION, r, "Marked as sent, but Yuki never booked it.");
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
      add("unverified", ACTION, r, "Marked as sent but never verified in Yuki.");
    }

    if (r.amountMismatch) {
      add(
        "amount_mismatch",
        ACTION,
        r,
        `Yuki booked ${euro(r.yukiAmount)}, invoice is ${euro(r.total)}. Correct in Yuki.`
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
        `Booked with an adjustment line of ${euro(r.yukiAmountCorrection)}: the order's items did not add up to the invoice. Check the order.`
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
        `Customer paid ${euro(r.paidAmount)} online, invoice says ${euro(r.total)}.`
      );
    }

    if (r.mismatch) {
      add(
        "status_mismatch",
        ACTION,
        r,
        `Paid in Sanity, but Yuki reports ${euro(r.openAmount)} open and no payment was found.`
      );
    }

    if (r.paymentReceived?.partial) {
      add(
        "partial_payment",
        BOOKKEEPING,
        r,
        `${euro(r.paymentReceived.amount)} received on ${r.paymentReceived.date} quoting this invoice, ${euro(r.owed)} owed. Check before reminding.`
      );
    } else if (r.paymentReceived) {
      add(
        "paid_not_linked",
        BOOKKEEPING,
        r,
        `${euro(r.paymentReceived.amount)} from ${r.paymentReceived.contact} on ${r.paymentReceived.date} — link in Yuki.`
      );
    }
  }

  for (const o of orphans || []) {
    add(
      "orphan",
      ACTION,
      { invoiceNumber: o.invoiceNumber },
      `Open in Yuki (${euro(o.openAmount)}) but no such invoice in Sanity.`
    );
  }

  return findings;
}

export const KIND_LABELS = {
  yuki_unreachable: "Yuki unreachable",
  not_booked: "Not booked in Yuki",
  missing_in_yuki: "Missing in Yuki",
  unverified: "Never verified",
  amount_mismatch: "Amount differs from invoice",
  adjusted: "Booked with adjustment",
  status_mismatch: "Paid in Sanity, open in Yuki",
  paid_amount_mismatch: "Paid online ≠ invoice total",
  orphan: "In Yuki, not in Sanity",
  partial_payment: "Partial payment",
  paid_not_linked: "Paid, not linked in Yuki",
};
