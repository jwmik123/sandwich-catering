# Gapless invoice number, separate from quoteId

We want a chronological, human-facing invoice number (`2026-0001`) that appears on the branded PDF and in Yuki, and is gapless (Dutch law requires continuous sequential invoice numbering).

It **cannot** be the `quoteId`. quoteId is minted at quote-creation time for every quote, and most quotes never become invoices — using it as the invoice number would leave large gaps (`2026-0001, 2026-0007, …`), which is both ugly and non-compliant. Gapless numbering can only be consumed by invoices that are actually booked.

Decision: introduce a distinct `invoiceNumber`, formatted `CAT-<year>-<NNNN>`, minted at **Invoice booking time** (in `sendInvoiceEmail` for bank-transfer, in the Mollie webhook's `handlePaidStatus` for online) from an atomic per-year Sanity counter (`invoiceCounter-<year>`, `inc`, reset each January). `quoteId` stays as the random early order handle.

The `CAT-` prefix is deliberate: the same Yuki administration already contains a manually-created `2026-NNN` invoice series (recurring lunch/PO business). Minting bare `2026-0001` would interleave two independent sequences in one namespace and risk near-duplicate numbers. Dutch law permits multiple invoice-number series as long as each is internally gapless, so the catering app owns the `CAT-` series.

Yuki uses the `<Reference>` field as the invoice number when `Process=true`, so we send `invoiceNumber` as the Reference — making Yuki's invoice number, the PDF number, and the reconciliation match-key (ADR 0002) all the same value. The customer's own PO/reference number is kept out of `<Reference>` so the invoice number stays clean.

Gaplessness is preserved by assigning the number once and **reusing it on booking retries** (never re-incrementing). A quote or order that never reaches booking never consumes a number.
