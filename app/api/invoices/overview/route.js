// Overview of all CAT- invoices, merged with Yuki's live open-debtor list.
// Powers the Studio "Reminders" tab so you can see, for every issued invoice,
// whether Yuki still considers it open, the open amount, and how many days it
// has been outstanding. Read-only.
export const dynamic = "force-dynamic";

import { client } from "@/sanity/lib/client";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Live open-debtor list from Yuki (reference === our invoiceNumber).
    const openMap = new Map();
    let yukiError = null;
    try {
      if (process.env.YUKI_ENABLED === "true") {
        const { apiKey, adminId } = validateYukiConfig();
        const yuki = new YukiApiClient(apiKey, adminId);
        const items = await yuki.getOutstandingDebtorItems();
        for (const it of items) {
          if (it.reference) openMap.set(String(it.reference).trim(), it);
        }
      } else {
        yukiError = "YUKI_ENABLED is not 'true'";
      }
    } catch (e) {
      yukiError = e.message;
    }

    // 2. All CAT- invoices in Sanity.
    const invoices = await client.withConfig({ useCdn: false }).fetch(
      `*[_type == "invoice" && defined(invoiceNumber) && invoiceNumber match "CAT-*"]{
        _id, invoiceNumber, quoteId, status, yukiSent, yukiVerifiedAt, yukiMissing, yukiError,
        paidAt, dueDate, reminderSentAt, createdAt,
        "customer": coalesce(companyDetails.name, orderDetails.name),
        "email": orderDetails.email,
        "billingEmail": orderDetails.invoiceEmail,
        "deliveryDate": orderDetails.deliveryDate,
        "total": amount.total,
        "molliePaymentId": *[_type == "quote" && quoteId == ^.quoteId][0].paymentId
      } | order(invoiceNumber asc)`
    );

    // 3. Merge.
    const now = Date.now();
    const rows = invoices.map((inv) => {
      const y = openMap.get(String(inv.invoiceNumber || "").trim());
      const openInYuki = !!y;
      // Paid online via Mollie at checkout. These are expected to stay "open"
      // in Yuki until the bookkeeper matches the Mollie payout — that is not
      // an anomaly and must never trigger a payment reminder.
      const paidOnline = !!inv.molliePaymentId;
      // Invoice date: prefer Yuki's, else delivery date, else created date.
      const dateStr =
        (y && y.date) || inv.deliveryDate || (inv.createdAt || "").slice(0, 10);
      const daysOpen =
        openInYuki && dateStr
          ? Math.floor((now - new Date(dateStr).getTime()) / 86400000)
          : null;
      // Absence from Yuki's open list only means "settled" when we know the
      // invoice was booked there in the first place. Otherwise it is missing.
      const verifiedInYuki = !!inv.yukiVerifiedAt;
      // `yukiMissing` is set by reconciliation and by scripts/audit-yuki-bookings.js,
      // which also checks the revenue ledger — trust it over the live merge alone
      // (it catches online-paid invoices Yuki never booked, too).
      const missingInYuki =
        !openInYuki &&
        !verifiedInYuki &&
        (!!inv.yukiMissing || (!!inv.yukiSent && !paidOnline));

      return {
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer || null,
        email: inv.email || null,
        // Where invoices and reminders actually go for this customer.
        billingEmail: inv.billingEmail || null,
        total: inv.total ?? null,
        status: inv.status || null,
        yukiSent: !!inv.yukiSent,
        verifiedInYuki,
        missingInYuki,
        yukiError: inv.yukiError || null,
        openInYuki,
        openAmount: openInYuki ? y.openAmount : null,
        daysOpen,
        dueDate: inv.dueDate || (y ? y.dueDate : null),
        reminderSentAt: inv.reminderSentAt || null,
        paidOnline,
        // Online payment that Yuki still shows open — waiting on payout matching.
        awaitingPayout: paidOnline && openInYuki,
        // True anomaly: bank-transfer invoice marked paid in Sanity while Yuki
        // still reports it open (online-paid ones are expected, see above).
        mismatch: inv.status === "paid" && openInYuki && !paidOnline,
      };
    });

    // 4. Any CAT- items open in Yuki but with no Sanity invoice (orphans).
    const sanityRefs = new Set(
      invoices.map((i) => String(i.invoiceNumber || "").trim())
    );
    const orphans = [...openMap.entries()]
      .filter(([ref]) => ref.startsWith("CAT-") && !sanityRefs.has(ref))
      .map(([ref, y]) => ({ invoiceNumber: ref, openAmount: y.openAmount }));

    return NextResponse.json({
      success: true,
      yukiError,
      count: rows.length,
      openInYukiCount: rows.filter((r) => r.openInYuki).length,
      missingInYukiCount: rows.filter((r) => r.missingInYuki).length,
      invoices: rows,
      orphans,
    });
  } catch (error) {
    console.error("invoices/overview error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
