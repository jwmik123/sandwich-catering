// Proves from Yuki's revenue ledger whether an invoice was ever booked.
//
// An invoice that is paid and settled is absent from Yuki's open-debtor list —
// but so is one Yuki never booked. The ledger tells them apart. Ledger rows
// carry no invoice number, only contact, date, amount and description, so the
// proof is: on the invoice date, some contact's revenue adds up to this
// invoice's net amount.
//
// The first version of this check accepted "same customer has any revenue
// within 7 days". For a customer ordering almost daily (BME) every missing
// invoice was then covered by a neighbouring one, and ten missing invoices
// passed as booked. Hence: exact date, exact amount.
//
// Pure — no imports — so both the app and scripts/audit-yuki-bookings.js use it.

const round2 = (n) => Math.round(n * 100) / 100;
const TOLERANCE = 0.06;

export const normalizeName = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/\bb\.?\s?v\.?(?=\s|$)/g, " ")
    .replace(/\bn\.?\s?v\.?(?=\s|$)/g, " ")
    .replace(/\bstichting\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");

/**
 * @param {Array<{invoiceNumber, customer, date, altDates, subtotal, delivery}>} invoices
 *   Invoices to prove (already known NOT to be open in Yuki and not verified).
 *   `date` is the Yuki invoice date (the delivery date), YYYY-MM-DD. `altDates`
 *   are other days it may have been booked on — older bookings used the day
 *   the invoice was sent, which hid CAT-2026-0010 from a delivery-date search.
 * @param {Array<{contact, date, amount}>} ledger  Revenue (80001) transactions.
 * @returns {Array<{invoiceNumber, verdict: "booked"|"amount_differs"|"missing", detail}>}
 */
export function auditAgainstLedger(invoices, ledger) {
  // Revenue per contact per day.
  const byDay = new Map(); // date -> Map(contact -> sum)
  for (const t of ledger) {
    const day = byDay.get(t.date) || new Map();
    day.set(t.contact, round2((day.get(t.contact) || 0) + Math.abs(t.amount)));
    byDay.set(t.date, day);
  }

  // A customer can have several invoices on one day (four identical BME orders
  // on 12 August); the ledger then shows their sum on one contact.
  const groups = new Map();
  for (const inv of invoices) {
    const key = `${normalizeName(inv.customer)}|${inv.date}`;
    groups.set(key, [...(groups.get(key) || []), inv]);
  }

  const results = [];
  for (const group of groups.values()) {
    const date = group[0].date;
    const day = byDay.get(date) || new Map();
    const want = normalizeName(group[0].customer);
    const net = (inv) => round2((inv.subtotal || 0) + (inv.delivery || 0));
    const groupNet = round2(group.reduce((s, inv) => s + net(inv), 0));
    const daySums = [...day.values()];

    const near = (a, b) => Math.abs(a - b) <= TOLERANCE;
    const wholeGroupBooked = daySums.some((s) => near(s, groupNet));

    // Same-named contact with revenue that day, but for a different amount:
    // booked, just not for what the invoice says (missing delivery, upsell…).
    const namedSum = [...day.entries()]
      .filter(([contact]) => {
        const c = normalizeName(contact);
        return c && want && (c.includes(want) || want.includes(c));
      })
      .reduce((s, [, sum]) => round2(s + sum), 0);

    for (const inv of group) {
      const onAltDate = (inv.altDates || []).some((d) =>
        [...(byDay.get(d) || new Map()).values()].some((s) => near(s, net(inv)))
      );
      if (onAltDate || wholeGroupBooked || daySums.some((s) => near(s, net(inv)))) {
        results.push({ invoiceNumber: inv.invoiceNumber, verdict: "booked", detail: "" });
      } else if (
        inv.delivery > 0 &&
        daySums.some((s) => near(s, round2(inv.subtotal || 0)))
      ) {
        // The known webhook bug: booked without its delivery cost, possibly
        // under a contact name we cannot relate to the customer.
        results.push({
          invoiceNumber: inv.invoiceNumber,
          verdict: "amount_differs",
          detail: `Booked on ${date} without the €${inv.delivery.toFixed(2)} delivery cost.`,
        });
      } else if (namedSum > 0) {
        results.push({
          invoiceNumber: inv.invoiceNumber,
          verdict: "amount_differs",
          detail: `Yuki has €${namedSum.toFixed(2)} revenue for this customer on ${date}, invoice net is €${groupNet.toFixed(2)}${group.length > 1 ? ` across ${group.length} invoices` : ""}.`,
        });
      } else {
        results.push({
          invoiceNumber: inv.invoiceNumber,
          verdict: "missing",
          detail: `No revenue of €${net(inv).toFixed(2)} on ${date} under any contact.`,
        });
      }
    }
  }
  return results;
}
