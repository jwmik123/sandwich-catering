// app/api/send-invoice/route.js
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { createYukiInvoice } from "@/lib/yuki-api";
import { invoiceToEmailData } from "@/lib/invoice-email-data";
import { sendReplacementInvoice } from "@/lib/amend-invoice";

export async function POST(request) {
  console.log("===== SEND INVOICE API CALLED =====");

  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      console.error("Missing invoiceId in request");
      return NextResponse.json(
        { success: false, error: "Missing invoiceId" },
        { status: 400 }
      );
    }

    console.log("Fetching invoice with ID:", invoiceId);

    // Fetch the invoice from Sanity — bypass CDN to always get the latest published data
    const invoice = await client.withConfig({ useCdn: false }).fetch(
      `*[_type == "invoice" && _id == $invoiceId][0]`,
      { invoiceId }
    );

    if (!invoice) {
      console.error(`Invoice with ID ${invoiceId} not found`);
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    console.log("Invoice found:", invoice.quoteId);

    // Check if email exists in orderDetails
    if (!invoice.orderDetails?.email) {
      console.error(`No email found in invoice orderDetails for ${invoice.quoteId}`);
      return NextResponse.json(
        { success: false, error: "No email address found for this invoice" },
        { status: 404 }
      );
    }

    console.log("Email found:", invoice.orderDetails.email);

    // Fetch sandwich options for the email (matching cron job)
    const sandwichOptions = await client.fetch(PRODUCT_QUERY);
    console.log(`Retrieved ${sandwichOptions.length} sandwich options`);

    // A changed order: credit the old invoice, book this one, mail both (ADR 0004).
    if (invoice.replaces?._ref) {
      const result = await sendReplacementInvoice(invoice._id);
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    const emailData = invoiceToEmailData(invoice, sandwichOptions);

    console.log("Sending invoice email to:", invoice.orderDetails.email);

    // Send the invoice email (matching cron job)
    const emailSent = await sendOrderConfirmation(emailData, true);

    if (emailSent) {
      console.log("Invoice email sent successfully");

      // If email is sent successfully, also create the Yuki invoice (matching cron job).
      // Awaited on purpose: unawaited work gets killed on serverless once the
      // response returns, leaving yukiSent unset (breaks reconciliation).
      if (process.env.YUKI_ENABLED === "true") {
        console.log(
          `Creating Yuki invoice for quote: ${invoice.quoteId}`
        );
        try {
          await createYukiInvoice(invoice.quoteId, invoice._id);
        } catch (error) {
          console.error(
            `Yuki invoice creation failed for ${invoice.quoteId}:`,
            error
          );
        }
      } else {
        console.log(
          "Yuki integration disabled, skipping invoice creation."
        );
      }

      // Update the invoice status to indicate email was sent (matching cron job)
      await client
        .patch(invoice._id)
        .set({ emailSent: true, emailSentAt: new Date().toISOString() })
        .commit();

      console.log("===== SEND INVOICE API COMPLETED SUCCESSFULLY =====");
      return NextResponse.json({
        success: true,
        message: `Invoice sent to ${invoice.orderDetails.email}`,
      });
    } else {
      console.error("Failed to send invoice email");
      return NextResponse.json(
        { success: false, error: "Failed to send invoice email" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Send invoice failed:", error);
    console.error("Error stack:", error.stack);
    console.log("===== SEND INVOICE API FAILED =====");
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}
