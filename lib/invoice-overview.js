// Every CAT- invoice in Sanity, merged with Yuki's live view of it.
//
// One source of truth for "what is the real state of this invoice", shared by
// the Studio Reminders tab (app/api/invoices/overview) and the nightly
// consistency check (app/api/cron/consistency-check), so the report and the
// screen can never disagree.
import { client } from "@/sanity/lib/client";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";
import { matchReceiptsToInvoices } from "@/lib/payment-matching";

// Yuki's booked amount may differ from the PDF by at most rounding.
export const AMOUNT_MISMATCH_TOLERANCE = 0.02;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @returns {Promise<{yukiError: string|null, rows: Array, orphans: Array, receipts: Array}>}
 *   `yukiError` is set when Yuki could not be read; rows are then Sanity-only.
 */
export async function buildInvoiceOverview() {
  // 1. Live open-debtor list from Yuki (reference === our invoiceNumber).
  const openMap = new Map();
  // Money Yuki received but the bookkeeper has not linked to an invoice yet.
  const receipts = [];
  let yukiError = null;
  try {
    if (process.env.YUKI_ENABLED === "true") {
      const { apiKey, adminId } = validateYukiConfig();
      const yuki = new YukiApiClient(apiKey, adminId);
      const items = await yuki.getOutstandingDebtorItems({
        includeBankTransactions: true,
      });
      for (const it of items) {
        if (it.openAmount < 0) {
          receipts.push({
            documentId: it.documentId,
            date: it.date,
            amount: Math.abs(it.openAmount),
            contact: it.contact,
            description: it.description,
          });
        } else if (it.reference) {
          openMap.set(String(it.reference).trim(), it);
        }
      }
    } else {
      yukiError = "YUKI_ENABLED is not 'true'";
    }
  } catch (e) {
    yukiError = e.message;
  }

  // 2. All CAT- invoices in Sanity.
  const invoices = await client.withConfig({ useCdn: false }).fetch(
    `*[_type == "invoice" && defined(invoiceNumber) && invoiceNumber match "CAT-*"]{
      _id, invoiceNumber, quoteId, status, yukiSent, yukiSentAt, yukiVerifiedAt,
      yukiMissing, yukiError, yukiAmountCorrection,
      paidAt, dueDate, reminderSentAt, createdAt,
      "customer": coalesce(companyDetails.name, orderDetails.name),
      "email": orderDetails.email,
      "billingEmail": orderDetails.invoiceEmail,
      "deliveryDate": orderDetails.deliveryDate,
      "total": amount.total,
      paidAmount,
      "molliePaymentId": *[_type == "quote" && quoteId == ^.quoteId][0].paymentId
    } | order(invoiceNumber asc)`
  );

  // 3. What does the customer really still owe? Yuki's open amount is
  // measured against what Yuki booked; when that differs from the invoice
  // we sent, the customer owes the invoice total minus what Yuki already
  // counts as paid. (E.g. Yuki booked €708.40 for a €650.40 invoice, the
  // customer paid €650.40, Yuki shows €58 open — they owe nothing.)
  const owedFor = (inv, y) => {
    if (!y) return null;
    if (typeof inv.total !== "number") return y.openAmount;
    const paidSoFar = y.originalAmount - y.openAmount;
    return round2(Math.max(0, inv.total - paidSoFar));
  };

  // 4. Which open invoices already have their money sitting in Yuki?
  const paymentMatches = matchReceiptsToInvoices(
    receipts,
    invoices
      .map((inv) => ({ inv, y: openMap.get(String(inv.invoiceNumber || "").trim()) }))
      .filter(({ inv, y }) => y && owedFor(inv, y) > 0.01)
      .map(({ inv, y }) => ({
        invoiceNumber: inv.invoiceNumber,
        quoteId: inv.quoteId,
        customer: y.contact || inv.customer,
        openAmount: owedFor(inv, y),
        date: y.date || inv.deliveryDate,
      }))
  );

  // 5. Merge.
  const now = Date.now();
  const rows = invoices.map((inv) => {
    const y = openMap.get(String(inv.invoiceNumber || "").trim());
    const openInYuki = !!y;
    // Paid online via Mollie at checkout. These are expected to stay "open"
    // in Yuki until the bookkeeper matches the Mollie payout — that is not
    // an anomaly and must never trigger a payment reminder.
    const paidOnline = !!inv.molliePaymentId;
    // Invoice date: prefer Yuki's, else delivery date, else created date.
    const dateStr =
      (y && y.date) || inv.deliveryDate || (inv.createdAt || "").slice(0, 10);
    const daysOpen =
      openInYuki && dateStr
        ? Math.floor((now - new Date(dateStr).getTime()) / 86400000)
        : null;
    const verifiedInYuki = !!inv.yukiVerifiedAt;
    // Only `yukiMissing` decides this, never absence alone: an invoice booked
    // before yukiVerifiedAt existed, paid and settled, is absent from the open
    // list for an entirely innocent reason. The flag is set by reconciliation
    // and by scripts/audit-yuki-bookings.js, which check the revenue ledger too.
    const missingInYuki = !openInYuki && !!inv.yukiMissing;

    // Paid, but Yuki has not linked the payment yet — never remind these.
    const payment = paymentMatches.get(inv.invoiceNumber) || null;

    // Yuki booked a different receivable than the invoice the customer got.
    const yukiAmount = y ? y.originalAmount : null;
    const amountMismatch =
      yukiAmount !== null &&
      typeof inv.total === "number" &&
      Math.abs(yukiAmount - inv.total) > AMOUNT_MISMATCH_TOLERANCE;

    // Open in Yuki only because Yuki booked too much: nothing is owed.
    const owed = owedFor(inv, y);
    const settledPerInvoice = openInYuki && owed !== null && owed <= 0.01;

    return {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer || null,
      email: inv.email || null,
      // Where invoices and reminders actually go for this customer.
      billingEmail: inv.billingEmail || null,
      total: inv.total ?? null,
      paidAmount: inv.paidAmount ?? null,
      status: inv.status || null,
      deliveryDate: inv.deliveryDate || null,
      yukiSent: !!inv.yukiSent,
      yukiSentAt: inv.yukiSentAt || null,
      verifiedInYuki,
      missingInYuki,
      yukiError: inv.yukiError || null,
      yukiAmountCorrection: inv.yukiAmountCorrection || 0,
      openInYuki,
      openAmount: openInYuki ? y.openAmount : null,
      paymentReceived: payment,
      yukiAmount,
      amountMismatch,
      owed,
      settledPerInvoice,
      daysOpen,
      dueDate: inv.dueDate || (y ? y.dueDate : null),
      reminderSentAt: inv.reminderSentAt || null,
      paidOnline,
      // Online payment that Yuki still shows open — waiting on payout matching.
      awaitingPayout: paidOnline && openInYuki,
      // True anomaly: bank-transfer invoice marked paid in Sanity while Yuki
      // still reports it open (online-paid ones are expected, see above).
      // (A matched bank receipt explains it — that is just unlinked bookkeeping.)
      mismatch:
        inv.status === "paid" &&
        openInYuki &&
        !paidOnline &&
        !(payment && !payment.partial) &&
        !settledPerInvoice,
    };
  });

  // 6. Any CAT- items open in Yuki but with no Sanity invoice (orphans).
  const sanityRefs = new Set(
    invoices.map((i) => String(i.invoiceNumber || "").trim())
  );
  const orphans = [...openMap.entries()]
    .filter(([ref]) => ref.startsWith("CAT-") && !sanityRefs.has(ref))
    .map(([ref, y]) => ({ invoiceNumber: ref, openAmount: y.openAmount }));

  return { yukiError, rows, orphans, receipts };
}
