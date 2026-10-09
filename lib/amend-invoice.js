// Changing an order after its invoice was issued (ADR 0004).
//
// An issued invoice is never edited. Instead:
//   1. createReplacementInvoice: copy it into a new, unbooked invoice that can be
//      edited in the Studio (`replaces` points at the old one).
//   2. sendReplacementInvoice: credit the old invoice in Yuki, book the new one,
//      and mail both PDFs to the customer in one message.
//
// The credit is booked first: if anything fails halfway the customer is never
// left with two open invoices, at worst with none until the step is retried.
// Every step is idempotent, so "Send Invoice" can simply be pressed again.
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { createYukiInvoice } from "@/lib/yuki-api";
import { bookCreditNote } from "@/lib/credit-note";
import { sendOrderConfirmation } from "@/lib/email";
import { invoiceToEmailData } from "@/lib/invoice-email-data";

const fresh = client.withConfig({ useCdn: false });

const ref = (id) => ({ _type: "reference", _ref: id, _weak: true });

// What an invoice bills and to whom: copied to the replacement, frozen in the credit note.
const BILLING_FIELDS = [
  "quoteId",
  "referenceNumber",
  "amount",
  "companyDetails",
  "orderDetails",
];

/**
 * Why this invoice cannot be changed through a credit note, or null when it can.
 */
export function amendBlocker(invoice) {
  if (!invoice) return "Invoice not found.";
  if (!invoice.yukiSent) return "Not booked in Yuki yet — edit the invoice directly.";
  if (invoice.status === "cancelled") return "This invoice is cancelled.";
  if (invoice.status === "paid" || typeof invoice.paidAmount === "number") {
    return "This invoice is paid. Changing it means a refund, which this flow does not do.";
  }
  return null;
}

/**
 * Copy a booked invoice into a new editable invoice that will replace it.
 * Returns the existing replacement when there already is one.
 * @returns {Promise<{success: boolean, invoiceId?: string, error?: string}>}
 */
export async function createReplacementInvoice(invoiceId) {
  const old = await fresh.fetch(`*[_type == "invoice" && _id == $id][0]`, { id: invoiceId });
  const blocker = amendBlocker(old);
  if (blocker) return { success: false, error: blocker };

  if (old.replacedBy?._ref) {
    const existing = await fresh.fetch(`*[_id == $id][0]{_id}`, { id: old.replacedBy._ref });
    if (existing) return { success: true, invoiceId: existing._id, existing: true };
  }

  const copy = Object.fromEntries(
    BILLING_FIELDS.filter((k) => old[k] !== undefined).map((k) => [k, old[k]])
  );
  const replacement = await fresh.create({
    _type: "invoice",
    ...copy,
    status: "pending",
    dueDate: old.dueDate,
    // Same order, so same order date: it lists next to the invoice it replaces.
    createdAt: old.createdAt || new Date().toISOString(),
    replaces: ref(old._id),
  });
  await fresh.patch(old._id).set({ replacedBy: ref(replacement._id) }).commit();

  return { success: true, invoiceId: replacement._id };
}

/**
 * Credit the replaced invoice, book the replacement and mail both.
 * With `email: false` only Yuki and Sanity are set right: for when the customer
 * already has the corrected invoice by hand. Mailing later is still possible.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function sendReplacementInvoice(invoiceId, { email = true } = {}) {
  const invoice = await fresh.fetch(`*[_type == "invoice" && _id == $id][0]`, { id: invoiceId });
  if (!invoice?.replaces?._ref) {
    return { success: false, error: "This invoice does not replace another one." };
  }
  if (invoice.emailSent) {
    return { success: false, error: "This replacement invoice was already sent." };
  }
  const old = await fresh.fetch(`*[_type == "invoice" && _id == $id][0]`, {
    id: invoice.replaces._ref,
  });
  if (!old) return { success: false, error: "The invoice it replaces no longer exists." };

  // 1. Credit the old invoice (skipped when a credit note is already booked).
  const credit = await ensureCreditNote(old, invoice._id);
  if (!credit.success) return credit;

  // 2. Book the replacement.
  if (!invoice.yukiSent) {
    const booked = await createYukiInvoice(invoice.quoteId, invoice._id);
    if (!booked?.success) {
      return {
        success: false,
        error: `Old invoice is credited (${credit.creditNoteNumber}), but booking the new invoice failed: ${booked?.error || "unknown error"}. Press Send Invoice again.`,
      };
    }
  }

  if (!email) {
    const done = await fresh.fetch(`*[_type == "invoice" && _id == $id][0]{invoiceNumber}`, {
      id: invoice._id,
    });
    await fresh.patch(invoice._id).set({ emailSkippedAt: new Date().toISOString() }).commit();
    return {
      success: true,
      message: `Credited ${old.invoiceNumber} (${credit.creditNoteNumber}) and booked ${done.invoiceNumber} in Yuki. Nothing was mailed.`,
    };
  }

  // 3. One mail: the new invoice plus the credit note for the old one.
  const [booked, creditNote, sandwichOptions] = await Promise.all([
    fresh.fetch(`*[_type == "invoice" && _id == $id][0]`, { id: invoice._id }),
    fresh.fetch(`*[_type == "creditNote" && _id == $id][0]`, { id: credit.creditNoteId }),
    fresh.fetch(PRODUCT_QUERY),
  ]);
  const snapshot = JSON.parse(creditNote.creditedSnapshot);
  const order = invoiceToEmailData(booked, sandwichOptions);
  order.replacement = {
    invoiceNumber: booked.invoiceNumber,
    oldInvoiceNumber: old.invoiceNumber,
    creditNoteNumber: creditNote.creditNoteNumber,
    creditNoteOrder: invoiceToEmailData(
      { ...old, orderDetails: snapshot.orderDetails, amount: snapshot.amount },
      sandwichOptions
    ),
  };

  const sent = await sendOrderConfirmation(order, true);
  if (!sent) {
    return {
      success: false,
      error: `Credited ${old.invoiceNumber} and booked ${booked.invoiceNumber}, but the e-mail failed. Press Send Invoice again.`,
    };
  }

  const now = new Date().toISOString();
  await fresh
    .transaction()
    .patch(invoice._id, (p) => p.set({ emailSent: true, emailSentAt: now }))
    .patch(creditNote._id, (p) => p.set({ emailSentAt: now }))
    .commit();

  return {
    success: true,
    message: `Sent ${booked.invoiceNumber} with credit note ${creditNote.creditNoteNumber} for ${old.invoiceNumber}.`,
  };
}

/**
 * Make sure the old invoice is credited in Yuki and cancelled in Sanity.
 * Reuses a credit note that already exists for it.
 */
async function ensureCreditNote(old, replacementId) {
  let creditNote = await fresh.fetch(
    `*[_type == "creditNote" && invoice._ref == $id] | order(_createdAt desc)[0]`,
    { id: old._id }
  );

  if (!creditNote) {
    // The invoice is locked once booked, so its current state is what Yuki holds.
    // bookCreditNote still checks that against Yuki before booking.
    creditNote = await fresh.create({
      _type: "creditNote",
      invoice: { _type: "reference", _ref: old._id },
      invoiceNumber: old.invoiceNumber,
      replacementInvoice: ref(replacementId),
      reason: "Order changed after the invoice was issued; replaced by a new invoice.",
      amount: old.amount,
      creditedSnapshot: JSON.stringify({
        rev: old._rev,
        orderDetails: old.orderDetails,
        amount: old.amount,
      }),
      createdAt: new Date().toISOString(),
    });
  } else if (!creditNote.replacementInvoice?._ref) {
    await fresh.patch(creditNote._id).set({ replacementInvoice: ref(replacementId) }).commit();
  }

  if (!creditNote.yukiSent) {
    const result = await bookCreditNote(creditNote._id);
    if (!result.success) {
      return { success: false, error: `Crediting ${old.invoiceNumber} failed: ${result.error}` };
    }
    creditNote = await fresh.fetch(`*[_id == $id][0]`, { id: creditNote._id });
  }

  // Cancelled keeps reconciliation from reading the netted-off invoice as "paid",
  // and keeps reminders and the weekly check away from it.
  if (old.status !== "cancelled" || old.creditNote?._ref !== creditNote._id) {
    await fresh
      .patch(old._id)
      .set({ status: "cancelled", creditNote: ref(creditNote._id) })
      .commit();
  }

  return {
    success: true,
    creditNoteId: creditNote._id,
    creditNoteNumber: creditNote.creditNoteNumber,
  };
}
