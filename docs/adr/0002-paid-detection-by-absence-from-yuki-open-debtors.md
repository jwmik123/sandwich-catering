# Paid-detection by absence from Yuki's open-debtor list

We need Sanity to know when a Bank-transfer invoice is paid, without a human checking Yuki. Two constraints, both invisible in code and both confirmed by testing the live API:

1. **Yuki has no payment webhook** — status must be polled.
2. **`ProcessSalesInvoices` does not return Yuki's invoice number or document GUID** — it only echoes our free-text `Reference`. So `CheckOutstandingItem`, which keys on Yuki's numeric number/GUID, cannot be called directly per invoice.

Decision: a nightly cron calls `OutstandingDebtorItems` (which *does* include our `<Reference>`, verified against the live admin), builds the set of still-open references, and marks any booked Sanity invoice **absent** from that set as `paid`. The match key is the **Invoice number** (see ADR 0003), which is what we send as the Yuki `<Reference>`. This is *inferred*-paid (absence), not *confirmed*-paid, and treats payment as binary (partial payments — `OpenAmount < OriginalAmount` — are only logged, not modeled).

A future dev may ask "why not just query each invoice's status?" — because Yuki never gives us an ID to query by. The list-diff is the way around that, and costs one API call per run regardless of volume.
