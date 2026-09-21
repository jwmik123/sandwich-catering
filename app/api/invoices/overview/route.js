// Overview of all CAT- invoices, merged with Yuki's live open-debtor list.
// Powers the Studio "Reminders" tab so you can see, for every issued invoice,
// whether Yuki still considers it open, the open amount, and how many days it
// has been outstanding. Read-only. The merge itself lives in
// lib/invoice-overview.js, shared with the nightly consistency check.
export const dynamic = "force-dynamic";

import { buildInvoiceOverview } from "@/lib/invoice-overview";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { yukiError, rows, orphans, receipts } = await buildInvoiceOverview();

    return NextResponse.json({
      success: true,
      yukiError,
      count: rows.length,
      openInYukiCount: rows.filter((r) => r.openInYuki).length,
      missingInYukiCount: rows.filter((r) => r.missingInYuki).length,
      paidUnmatchedCount: rows.filter(
        (r) => r.paymentReceived && !r.paymentReceived.partial
      ).length,
      unmatchedReceiptCount: receipts.length,
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
