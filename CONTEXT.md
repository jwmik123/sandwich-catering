# Sandwich Catering — Ordering & Invoicing

Catering order app for The Sandwichbar. Orders are captured in Sanity, paid via Mollie or bank transfer, booked into Yuki accounting, and invoiced as branded PDFs.

## Language

**Order**:
A customer's catering request captured through the 6-step wizard and stored as a `quote` document in Sanity.
_Avoid_: purchase, transaction

**Invoice**:
A request for payment for an Order, stored as an `invoice` document in Sanity and booked into Yuki.
_Avoid_: bill

**quoteId**:
The early order handle (e.g. `Qk6ylt2x7`), minted at quote creation for *every* quote, used for payment metadata and lookup URLs. Random; gaps are meaningless because most quotes never become Invoices.
_Avoid_: order number, invoice number

**Invoice number**:
The gapless, chronological, human-facing number (`CAT-2026-0001`) minted at Invoice **booking** time (not quote time). It is simultaneously the number printed on the branded PDF, the Yuki `<Reference>` (Yuki uses Reference as its invoice number when `Process=true`), and the key Reconciliation matches on. The `CAT-` prefix keeps it a distinct series from the manually-created `2026-NNN` invoices that share the same Yuki administration. Distinct from **quoteId** — it cannot equal quoteId, because gapless numbering can only be consumed by real booked Invoices.
_Avoid_: quoteId, reference

**Online payment**:
An Order prepaid immediately through Mollie (e.g. iDEAL). Payment is known the moment it happens via the Mollie webhook; the Invoice is created already `paid`.
_Avoid_: Mollie order, card payment

**Bank-transfer invoice**:
An Order where the customer chose `paymentMethod === "invoice"` and pays later by bank transfer. Yuki books it with `PaymentMethod: Bank`. Payment is only known to Yuki, not to Sanity — this is the flow all current Yuki fixes target.
_Avoid_: invoice order (ambiguous with the Invoice document)

**Reconciliation**:
The automated nightly check that compares Sanity Bank-transfer invoices against Yuki's open-debtor list (matching on **Invoice number** = Yuki `<Reference>`) and flips `status` to `paid` (absent from list) or `overdue` (past due, still open).

**Reminder**:
A branded follow-up email (reusing the app's own Invoice PDF, never Yuki's) sent for an overdue Bank-transfer invoice. Sent **manually by a human** who selects invoices from a list — not auto-sent.

## Relationships

- An **Order** uses exactly one payment method — either **Online payment** or **Bank-transfer invoice**, never both.
- An **Order** produces exactly one **Invoice**.
- Every **Invoice** is booked into Yuki (when `YUKI_ENABLED`).
- Only **Bank-transfer invoices** need payment-status polling and reminders; **Online payments** are reconciled at creation.

## Flagged ambiguities

- **`status` vs `paymentStatus` on the Invoice** — resolved: `status` (`pending`/`paid`/`overdue`/`cancelled`) is the authoritative Invoice lifecycle field. `paymentStatus` is Mollie's payment-result enum and lives conceptually on the **quote** (Online payment) — it is not used to reconcile Bank-transfer invoices. Bank-transfer paid-detection writes `status: "paid"` + `paidAt`.
