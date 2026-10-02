// Gapless, chronological invoice numbers (see ADR 0003).
//
// Minted at Invoice *booking* time (not quote time) from an atomic per-year
// counter document (`invoiceCounter-<year>`). Idempotent: if the invoice already
// has a number it is returned unchanged, so booking retries reuse the same number
// and never burn a new one (keeps the sequence gapless).
//
// Credit notes get their own gapless series (`CR-<year>-NNNN`, counter
// `creditNoteCounter-<year>`), see ADR 0004.
import { client } from "@/sanity/lib/client";

/**
 * Atomically take the next number of a per-year series.
 * @returns {Promise<{year: number, seq: number}>}
 */
async function nextSequence(counterPrefix, series) {
  const year = new Date().getFullYear();
  const counterId = `${counterPrefix}-${year}`;

  // Create the year's counter if it doesn't exist yet (idempotent, race-safe),
  // then atomically increment it server-side and read back the new value.
  await client.createIfNotExists({
    _id: counterId,
    _type: "invoiceCounter",
    year,
    series,
    seq: 0,
  });

  const counter = await client
    .patch(counterId)
    .inc({ seq: 1 })
    .commit({ returnDocuments: true });

  const seq = counter?.seq;
  if (typeof seq !== "number" || seq < 1) {
    throw new Error(`nextSequence: failed to obtain ${series} sequence for ${year}`);
  }
  return { year, seq };
}

/**
 * Ensure the given invoice document has a gapless invoice number, minting one if needed.
 * @param {Object} invoice - Sanity invoice document (must have _id; may have invoiceNumber, createdAt)
 * @returns {Promise<string>} the invoice number, e.g. "2026-0001"
 */
export async function assignInvoiceNumber(invoice) {
  if (!invoice?._id) {
    throw new Error("assignInvoiceNumber: invoice._id is required");
  }

  // Idempotent — never re-issue a number for an invoice that already has one.
  if (invoice.invoiceNumber) {
    return invoice.invoiceNumber;
  }

  const { year, seq } = await nextSequence("invoiceCounter", "invoice");

  // "CAT-" prefix keeps this a distinct, gapless catering series, separate from
  // the manually-created "2026-NNN" invoice series in the same Yuki admin (ADR 0003).
  const invoiceNumber = `CAT-${year}-${String(seq).padStart(4, "0")}`;

  await client.patch(invoice._id).set({ invoiceNumber }).commit();

  console.log(`Assigned invoice number ${invoiceNumber} to invoice ${invoice._id}`);
  return invoiceNumber;
}

/**
 * Ensure the given credit note has a gapless credit note number, minting one if needed.
 * @param {Object} creditNote - Sanity creditNote document (must have _id)
 * @returns {Promise<string>} e.g. "CR-2026-0001"
 */
export async function assignCreditNoteNumber(creditNote) {
  if (!creditNote?._id) {
    throw new Error("assignCreditNoteNumber: creditNote._id is required");
  }
  if (creditNote.creditNoteNumber) {
    return creditNote.creditNoteNumber;
  }

  const { year, seq } = await nextSequence("creditNoteCounter", "creditNote");
  const creditNoteNumber = `CR-${year}-${String(seq).padStart(4, "0")}`;

  await client.patch(creditNote._id).set({ creditNoteNumber }).commit();

  console.log(`Assigned credit note number ${creditNoteNumber} to ${creditNote._id}`);
  return creditNoteNumber;
}
