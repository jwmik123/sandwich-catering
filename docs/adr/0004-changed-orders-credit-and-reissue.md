# Changed orders: credit the issued invoice and issue a new one

Once an invoice is booked in Yuki and mailed, it has been issued. Editing it afterwards splits the truth: on 30 Sept 2026 CAT-2026-0167 was booked and mailed at €155,64, then edited in the Studio to €147,70 and mailed again under the same number. Yuki refused the second booking ("invoice number already exists"), the app read that as "already booked" and marked it verified, and Yuki kept €155,64 open. Two different invoices now carried one number, which Dutch invoicing rules do not allow.

Decision: an issued invoice is never edited.

- **Locked.** `amount` and the order lines in `orderDetails` are read-only in the Studio once `yukiSent` is true. The addressee (`companyDetails`, `referenceNumber`, and name, e-mail, phone and address in `orderDetails`, see `lib/addressee.js`) stays editable. See "Name / address change". A rebooking that Yuki refuses as a duplicate is only called verified when Yuki's booked amount still equals the invoice. Otherwise `yukiError` says so.
- **Change order = credit + new invoice.** The Studio action "Change order" copies the invoice into a new, unbooked invoice (`replaces` → old) that can be edited. "Send Invoice" on that copy then:
  1. books a credit note for the **whole** old invoice;
  2. books the new invoice;
  3. mails the customer once, with the new invoice and the credit note attached;
  4. sets the old invoice to `cancelled` (`creditNote` → the credit note).

  The credit goes first, so a failure halfway never leaves the customer with two open invoices. Every step is idempotent, so pressing Send Invoice again resumes.

  "Book in Yuki (no e-mail)" does steps 1, 2 and 4 without mailing, for when the customer already has the corrected invoice by hand (`emailSkippedAt` records it). Send Invoice can still mail it later.
- **Full credit only.** Crediting part of an invoice (single lines) is not offered. "Credit all and reissue" covers every change with a single path. The customer simply pays the new invoice.
- **The credit note goes to the customer.** A business customer may already have deducted VAT on the issued invoice. A credit note that only exists in our books does not undo that.
- **Name / address change: no credit note.** Correcting only who the invoice is addressed to (name, address, e-mail, phone, reference, company details) does not go through credit + new invoice. Those fields stay editable on the issued invoice. After publishing, Send Invoice mails the same invoice (same number, same amount) with the corrected details. A verified booking is not sent to Yuki again, so the invoice in Yuki keeps the address it was booked with. This was decided on 12 Oct 2026, knowing that strictly a corrected invoice gets a new number. The amount and VAT don't change, and the business accepts that trade-off. "Change order" still uses credit + new invoice. When such a replacement only changes the addressee, the mail says so ("amount unchanged"). Every replacement is booked on the same Yuki contact as the old invoice, so the bookkeeper can match the credit note.
- **Paid invoices: name / address only.** Changing what a paid invoice bills (including ones paid online via Mollie) means a refund. This flow refuses that. "Change order" on a paid invoice gives a replacement with `paymentCarriedOver: true` (`status: "paid"`, `paidAt`, `paidAmount`, Mollie fields copied). Its `amount` and order lines are read-only, and Send Invoice refuses when they differ anyway.
  - The paid invoice is no longer on Yuki's open list, so the credit note (`creditsPaidInvoice: true`) can't be checked against an open item. Its proof is the invoice's own verified booking (`yukiVerifiedAt`), and it is booked on the contact stored there.
  - In Yuki the old invoice stays matched to the payment. The credit (−) and the new invoice (+) stay open until the bookkeeper matches them against each other. The weekly check names both. Until then the new invoice is open in Yuki while Sanity says paid. That is expected (`paidByReplaced`), so it is not reported as a mismatch and gets no reminders.
  - The customer gets the new invoice marked as paid ("nothing to pay"), with the credit note attached.

## Credit notes in Yuki

A credit note is a sales invoice with negative quantities, sent through the same `ProcessSalesInvoices` call. It mirrors the credited invoice line for line, so the VAT is exactly opposite. Before booking, the app checks that the credited invoice is still open in Yuki for exactly the credited amount. That proves the snapshot is what Yuki holds.

Credit notes have their own gapless series `CR-<year>-NNNN` (counter `creditNoteCounter-<year>`). A separate series is allowed as long as it is internally gapless, the same reasoning as ADR 0003.

Tested on 2 Oct 2026 with CR-2026-0001 (crediting CAT-2026-0167). Yuki does **not** net the credit note against the invoice. Both stay open on the same contact (−€155,64 and +€155,64) until the bookkeeper matches them. Consequences:

- A `CR-` open item is negative like an unlinked bank receipt, but it is never money received. The invoice overview keeps those items out of `receipts` (payment matching) and out of contact resolution.
- Once matched, the old invoice drops off Yuki's open list. Reconciliation reads such an absence as "paid" (ADR 0002). Status `cancelled` keeps it out of reconciliation, reminders and the weekly check.
- The weekly check (Monday morning) lists each open credit note as a bookkeeping to-do ("match the two in Yuki"), and lists a `CR-` item without a Sanity credit note as an action.
