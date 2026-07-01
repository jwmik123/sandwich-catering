// Nightly payment reconciliation for bank-transfer invoices (see ADR 0002).
// Compares booked Sanity invoices against Yuki's open-debtor list:
//   - absent (or residual <= tolerance) -> paid
//   - present and past due date         -> overdue
// Mollie (prepaid) invoices are already status "paid" and excluded by the query.
export const dynamic = "force-dynamic";

// A tiny residual open amount is treated as paid — covers 1-cent VAT rounding
// stragglers left in Yuki (real ones seen in production, e.g. €0.01 of €196.23).
const PAID_TOLERANCE = 0.05;

import { client } from "@/sanity/lib/client";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";
import { NextResponse } from "next/server";

export async function GET(request) {
  console.log("🔔 CRON: reconcile-payments started");

  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("❌ Unauthorized reconcile-payments call");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.YUKI_ENABLED !== "true") {
    console.log("Yuki disabled — skipping reconciliation.");
    return NextResponse.json({ success: true, skipped: "YUKI_ENABLED not true" });
  }

  try {
    // 1. Pull Yuki's current open-debtor list (one call). reference === our invoiceNumber.
    const { apiKey, adminId } = validateYukiConfig();
    const yuki = new YukiApiClient(apiKey, adminId);
    const openItems = await yuki.getOutstandingDebtorItems();

    const openMap = new Map();
    for (const it of openItems) {
      if (it.reference) openMap.set(String(it.reference).trim(), it);
    }
    console.log(`📥 Yuki reports ${openItems.length} open debtor item(s)`);

    // 2. Candidate invoices: booked into Yuki, numbered, not yet paid/cancelled.
    const invoices = await client.fetch(
      `*[_type == "invoice" && yukiSent == true && defined(invoiceNumber) && status in ["pending","overdue"]]{
        _id, invoiceNumber, dueDate, status, paidAt
      }`
    );
    console.log(`🔍 ${invoices.length} open invoice(s) to reconcile`);

    const now = new Date();
    const nowIso = now.toISOString();
    let paid = 0;
    let overdue = 0;
    let stillOpen = 0;

    for (const inv of invoices) {
      const ref = String(inv.invoiceNumber || "").trim();
      const openItem = openMap.get(ref);
      const patch = client.patch(inv._id).set({ yukiPaidCheckedAt: nowIso });

      if (!openItem || openItem.openAmount <= PAID_TOLERANCE) {
        // Absent from Yuki's open list, or only a rounding residual left => paid.
        patch.set({ status: "paid" });
        if (!inv.paidAt) patch.set({ paidAt: nowIso });
        paid++;
        if (openItem) {
          console.log(
            `✅ ${ref} marked paid (residual €${openItem.openAmount.toFixed(2)} within tolerance)`
          );
        } else {
          console.log(`✅ ${ref} marked paid`);
        }
      } else {
        // Still open. Log partial payment (binary model: not modelled, only logged).
        if (openItem.openAmount < openItem.originalAmount) {
          console.log(
            `➗ ${ref} partially paid: €${openItem.openAmount.toFixed(2)} open of €${openItem.originalAmount.toFixed(2)}`
          );
        }
        const due = inv.dueDate ? new Date(inv.dueDate) : null;
        if (due && due < now && inv.status !== "overdue") {
          patch.set({ status: "overdue" });
          overdue++;
          console.log(`⏰ ${ref} marked overdue`);
        } else {
          stillOpen++;
        }
      }

      await patch.commit();
    }

    console.log(
      `🏁 reconcile-payments done. paid=${paid} overdue=${overdue} stillOpen=${stillOpen}`
    );
    return NextResponse.json({
      success: true,
      checked: invoices.length,
      paid,
      overdue,
      stillOpen,
      openItemsFromYuki: openItems.length,
    });
  } catch (error) {
    console.error("❌ reconcile-payments error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
