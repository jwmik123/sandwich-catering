// Credit notes in Yuki (ADR 0004).
//
// An invoice that was booked in Yuki and mailed to the customer is never edited.
// To change the order, the old invoice is credited in full and a new invoice is
// issued. The credit note mirrors the booked invoice line for line with negative
// quantities: Yuki turns a sales invoice with a negative total into a credit
// note, and the same line split keeps the VAT exactly opposite.
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";
import { assignCreditNoteNumber } from "@/lib/invoice-number";
import { round2 } from "@/lib/vat-calculations";

const fresh = client.withConfig({ useCdn: false });

const VERIFY_DELAYS_MS = [0, 2000, 5000];

/**
 * Turn the booked invoice (snapshot) into credit note invoiceData for Yuki.
 * Pure apart from the formatter; throws when the lines don't reproduce the
 * credited total, so a credit note can never book a different amount.
 */
export function buildCreditNoteData(
  yukiClient,
  { snapshot, creditNoteNumber, invoiceNumber, contact, sandwichOptions, date }
) {
  const { invoiceData } = yukiClient.formatInvoiceFromOrderData(
    snapshot.orderDetails,
    invoiceNumber,
    snapshot.amount,
    sandwichOptions
  );

  const lines = invoiceData.lines.map((l) => ({
    ...l,
    quantity: -l.quantity,
    lineAmount: -l.lineAmount,
    lineVat: -l.lineVat,
  }));
  const total = round2(lines.reduce((s, l) => round2(s + l.lineAmount + l.lineVat), 0));
  if (Math.abs(total + round2(snapshot.amount.total)) > 0.01) {
    throw new Error(
      `Credit note lines total €${total.toFixed(2)}, expected −€${round2(snapshot.amount.total).toFixed(2)} — not booking.`
    );
  }

  return {
    ...invoiceData,
    reference: creditNoteNumber,
    subject: `Creditnota bij factuur ${invoiceNumber}`,
    invoiceDate: date,
    dueDate: date,
    contactCode: contact.code || "",
    contactData: { ...invoiceData.contactData, fullName: contact.name },
    lines,
    total,
  };
}

/**
 * Book a creditNote document in Yuki.
 *
 * Only an invoice that is still open in Yuki for exactly the credited amount can
 * be credited here: that proves the snapshot is what Yuki holds, and keeps
 * refunds of paid invoices (money back) out of this flow.
 *
 * @param {string} creditNoteId
 * @param {{dryRun?: boolean}} [opts] dryRun builds and returns the Yuki data without booking or minting a number
 */
export async function bookCreditNote(creditNoteId, { dryRun = false } = {}) {
  const creditNote = await fresh.fetch(`*[_type == "creditNote" && _id == $id][0]`, {
    id: creditNoteId,
  });
  if (!creditNote) throw new Error(`Credit note ${creditNoteId} not found`);
  if (creditNote.yukiSent) {
    return { success: true, alreadyBooked: true, creditNoteNumber: creditNote.creditNoteNumber };
  }

  const snapshot = JSON.parse(creditNote.creditedSnapshot || "null");
  if (!snapshot?.orderDetails || typeof snapshot?.amount?.total !== "number") {
    throw new Error(`Credit note ${creditNoteId} has no usable snapshot of the credited invoice`);
  }

  const { apiKey, adminId } = validateYukiConfig();
  const yukiClient = new YukiApiClient(apiKey, adminId);

  const open = (await yukiClient.getOutstandingDebtorItems()).find(
    (i) => i.reference === creditNote.invoiceNumber
  );
  const fail = async (message) => {
    if (!dryRun) {
      await fresh.patch(creditNoteId).set({ yukiError: message }).commit();
    }
    return { success: false, error: message };
  };
  if (!open) {
    return fail(
      `${creditNote.invoiceNumber} is not open in Yuki (paid or not booked) — cannot credit it here.`
    );
  }
  if (Math.abs(open.originalAmount - snapshot.amount.total) > 0.01) {
    return fail(
      `Yuki booked ${creditNote.invoiceNumber} for €${open.originalAmount.toFixed(2)}, the credit note is for €${snapshot.amount.total.toFixed(2)} — not booking.`
    );
  }

  const sandwichOptions = await fresh.fetch(PRODUCT_QUERY);
  const creditNoteNumber = dryRun
    ? creditNote.creditNoteNumber || "CR-DRYRUN"
    : await assignCreditNoteNumber(creditNote);

  const invoiceData = buildCreditNoteData(yukiClient, {
    snapshot,
    creditNoteNumber,
    invoiceNumber: creditNote.invoiceNumber,
    // Book on the exact contact the invoice sits on, or Yuki can't net them.
    contact: { code: open.contactCode, name: open.contact },
    sandwichOptions,
    date: new Date().toISOString().slice(0, 10),
  });

  if (dryRun) return { success: true, dryRun: true, invoiceData, open };

  try {
    await yukiClient.createSalesInvoice(invoiceData);
  } catch (e) {
    return fail(`Yuki rejected ${creditNoteNumber}: ${e.message}`);
  }

  const verified = await verifyCreditBooked(yukiClient, {
    creditNoteNumber,
    invoiceNumber: creditNote.invoiceNumber,
    invoiceOpenBefore: open.openAmount,
    creditTotal: snapshot.amount.total,
  });
  if (!verified) {
    return fail(
      `${creditNoteNumber} was accepted by Yuki but shows up neither as an open item nor against ${creditNote.invoiceNumber} — treat as NOT booked.`
    );
  }

  const now = new Date().toISOString();
  await fresh
    .patch(creditNoteId)
    .set({
      yukiSent: true,
      yukiSentAt: now,
      yukiVerifiedAt: now,
      yukiContactCode: open.contactCode,
      yukiContactName: open.contact,
      yukiError: null,
    })
    .commit();

  return { success: true, creditNoteNumber, verified };
}

/**
 * A booked credit note shows up in Yuki either as its own (negative) open item
 * or, when Yuki nets it against the invoice, as a lower open amount on the
 * invoice. Either proves it landed.
 */
async function verifyCreditBooked(
  yukiClient,
  { creditNoteNumber, invoiceNumber, invoiceOpenBefore, creditTotal }
) {
  for (const delay of VERIFY_DELAYS_MS) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const items = await yukiClient.getOutstandingDebtorItems();
    const credit = items.find((i) => i.reference === creditNoteNumber);
    if (credit) return { as: "open item", openAmount: credit.openAmount };
    const invoice = items.find((i) => i.reference === invoiceNumber);
    const invoiceOpenNow = invoice ? invoice.openAmount : 0;
    if (Math.abs(invoiceOpenBefore - invoiceOpenNow - creditTotal) <= 0.01) {
      return { as: "netted against invoice", invoiceOpenNow };
    }
  }
  return null;
}
