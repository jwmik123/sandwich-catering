# Changed orders: credit the issued invoice and issue a new one

Once an invoice is booked in Yuki and mailed, it has been issued. Editing it afterwards splits the truth: on 30 Sept 2026 CAT-2026-0167 was booked and mailed at €155,64, then edited in the Studio to €147,70 and mailed again under the same number. Yuki refused the second booking ("invoice number already exists"), the app read that as "already booked" and marked it verified, and Yuki kept €155,64 open. Two different invoices now carried one number, which Dutch invoicing rules do not allow.

Decision: an issued invoice is never edited.

- **Locked.** `amount`, `companyDetails` and `orderDetails` are read-only in the Studio once `yukiSent` is true. A rebooking that Yuki refuses as a duplicate is only called verified when Yuki's booked amount still equals the invoice. Otherwise `yukiError` says so.
- **Change order = credit + new invoice.** The Studio action "Change order" copies the invoice into a new, unbooked invoice (`replaces` → old) that can be edited. "Send Invoice" on that copy then:
  1. books a credit note for the **whole** old invoice;
  2. books the new invoice;
  3. mails the customer once, with the new invoice and the credit note attached;
  4. sets the old invoice to `cancelled` (`creditNote` → the credit note).

  The credit goes first, so a failure halfway never leaves the customer with two open invoices. Every step is idempotent, so pressing Send Invoice again resumes.

  "Book in Yuki (no e-mail)" does steps 1, 2 and 4 without mailing, for when the customer already has the corrected invoice by hand (`emailSkippedAt` records it). Send Invoice can still mail it later.
- **Full credit only.** Crediting part of an invoice (single lines) is not offered. "Credit all and reissue" covers every change with a single path. The customer simply pays the new invoice.
- **The credit note goes to the customer.** A business customer may already have deducted VAT on the issued invoice. A credit note that only exists in our books does not undo that.
- **Unpaid invoices only.** Changing a paid invoice (including ones paid online via Mollie) means a refund. This flow refuses those.

## Credit notes in Yuki

A credit note is a sales invoice with negative quantities, sent through the same `ProcessSalesInvoices` call. It mirrors the credited invoice line for line, so the VAT is exactly opposite. Before booking, the app checks that the credited invoice is still open in Yuki for exactly the credited amount. That proves the snapshot is what Yuki holds.

Credit notes have their own gapless series `CR-<year>-NNNN` (counter `creditNoteCounter-<year>`). A separate series is allowed as long as it is internally gapless, the same reasoning as ADR 0003.

Tested on 2 Oct 2026 with CR-2026-0001 (crediting CAT-2026-0167). Yuki does **not** net the credit note against the invoice. Both stay open on the same contact (−€155,64 and +€155,64) until the bookkeeper matches them. Consequences:

- A `CR-` open item is negative like an unlinked bank receipt, but it is never money received. The invoice overview keeps those items out of `receipts` (payment matching) and out of contact resolution.
- Once matched, the old invoice drops off Yuki's open list. Reconciliation reads such an absence as "paid" (ADR 0002). Status `cancelled` keeps it out of reconciliation, reminders and the weekly check.
- The weekly check (Monday morning) lists each open credit note as a bookkeeping to-do ("match the two in Yuki"), and lists a `CR-` item without a Sanity credit note as an action.
