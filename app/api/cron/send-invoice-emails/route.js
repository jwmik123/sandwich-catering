import { client } from "@/sanity/lib/client";
import { sendInvoiceEmail } from "@/app/actions/sendInvoiceEmail";
import { NextResponse } from "next/server";

export async function GET(request) {
  // Verify the request is from a trusted source (e.g., Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];

    // Find all invoices that:
    // 1. Have a delivery date of today
    // 2. Haven't had their invoice email sent yet
    const invoices = await client.fetch(
      `*[_type == "invoice" && 
        orderDetails.deliveryDate match $today && 
        !defined(emailSent)]`,
      { today }
    );

    console.log(`Found ${invoices.length} invoices to process for today`);

    const results = await Promise.allSettled(
      invoices.map((invoice) => sendInvoiceEmail(invoice.quoteId))
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error("Error processing invoice emails:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
