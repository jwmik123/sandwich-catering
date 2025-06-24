// Add this line to prevent caching
export const dynamic = "force-dynamic";

import { client } from "@/sanity/lib/client";
import { sendInvoiceEmail } from "@/app/actions/sendInvoiceEmail";
import { NextResponse } from "next/server";

export async function GET(request) {
  console.log("🔔 CRON JOB STARTED: send-invoice-emails-and-yuki");

  // Log the current date/time to confirm when this ran
  const executionTime = new Date().toISOString();
  console.log(`⏰ Execution time: ${executionTime}`);

  // Verify the request is from a trusted source (e.g., Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("❌ Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];
    console.log(`📅 Looking for invoices with delivery date: ${today}`);

    // Find all invoices that:
    // 1. Have a delivery date of today
    // 2. Haven't had their invoice email sent yet
    console.log("🔍 Querying Sanity database...");
    const invoices = await client.fetch(
      `*[_type == "invoice" && 
        orderDetails.deliveryDate match $today && 
        !defined(emailSent)]`,
      { today }
    );

    console.log(`✉️ Found ${invoices.length} invoices to process for today`);

    // Log invoice IDs for debugging
    if (invoices.length > 0) {
      console.log(
        "📋 Invoice IDs to process:",
        invoices.map((inv) => inv.quoteId || inv._id)
      );
    } else {
      console.log("📭 No invoices to process today");
    }

    const results = await Promise.allSettled(
      invoices.map((invoice) => {
        console.log(`🔄 Processing invoice: ${invoice.quoteId || invoice._id}`);
        return sendInvoiceEmail(invoice.quoteId);
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - successful;

    console.log(
      `✅ Processing complete. Success: ${successful}, Failed: ${failed}`
    );

    // Log any failures for debugging
    if (failed > 0) {
      console.log("❌ Failed invoices:");
      results.forEach((result, index) => {
        if (result.status === "rejected" || !result.value.success) {
          console.error(
            `  - Invoice ${invoices[index].quoteId || invoices[index]._id}: ${result.reason || JSON.stringify(result.value)}`
          );
        }
      });
    }

    console.log("🏁 CRON JOB COMPLETED");
    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error("❌ Error processing invoice emails:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
