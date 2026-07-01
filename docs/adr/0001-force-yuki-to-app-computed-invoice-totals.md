# Force Yuki to app-computed invoice totals

Our branded Invoice PDF computes VAT once on the whole invoice, rounded up (`Math.ceil((subtotal+delivery)*0.09)`), and that total is what the customer pays. Yuki, given per-line prices, recomputes VAT per line and sums it — a different rounding basis that produced 1-cent discrepancies, previously patched with an "Afrondingsverschil" adjustment line.

We decided the **PDF is the source of truth**. In the `ProcessSalesInvoices` XML we now set `<LineAmount>` and `<LineVATAmount>` per line, distributing VAT so `sum(LineVATAmount)` equals the stored `invoice.amount.vat` exactly (residual on the last line), and removed the afrondingsverschil hack.

Yuki's own docs warn this "deviates from Yuki's calculation methods" — that deviation is intentional. Anyone tempted to remove the override fields and "let Yuki calculate normally" will reintroduce the 1-cent gap.
