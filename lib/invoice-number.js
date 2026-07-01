// Gapless, chronological invoice numbers (see ADR 0003).
//
// Minted at Invoice *booking* time (not quote time) from an atomic per-year
// counter document (`invoiceCounter-<year>`). Idempotent: if the invoice already
// has a number it is returned unchanged, so booking retries reuse the same number
// and never burn a new one (keeps the sequence gapless).
import { client } from "@/sanity/lib/client";

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

  const year = new Date().getFullYear();
  const counterId = `invoiceCounter-${year}`;

  // Create the year's counter if it doesn't exist yet (idempotent, race-safe),
  // then atomically increment it server-side and read back the new value.
  await client.createIfNotExists({
    _id: counterId,
    _type: "invoiceCounter",
    year,
    seq: 0,
  });

  const counter = await client
    .patch(counterId)
    .inc({ seq: 1 })
    .commit({ returnDocuments: true });

  const seq = counter?.seq;
  if (typeof seq !== "number" || seq < 1) {
    throw new Error(`assignInvoiceNumber: failed to obtain sequence for ${year}`);
  }

  // "CAT-" prefix keeps this a distinct, gapless catering series, separate from
  // the manually-created "2026-NNN" invoice series in the same Yuki admin (ADR 0003).
  const invoiceNumber = `CAT-${year}-${String(seq).padStart(4, "0")}`;

  await client.patch(invoice._id).set({ invoiceNumber }).commit();

  console.log(`Assigned invoice number ${invoiceNumber} to invoice ${invoice._id}`);
  return invoiceNumber;
}
