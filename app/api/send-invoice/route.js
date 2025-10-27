// app/api/send-invoice/route.js
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { createYukiInvoice } from "@/lib/yuki-api";

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

    // Fetch the invoice from Sanity (matching cron job query)
    const invoice = await client.fetch(
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

    // Convert customSelection from Sanity array format to object format (matching cron job logic)
    if (
      invoice.orderDetails &&
      invoice.orderDetails.selectionType === "custom" &&
      Array.isArray(invoice.orderDetails.customSelection)
    ) {
      const customSelectionObject = invoice.orderDetails.customSelection.reduce(
        (acc, item) => {
          // Use sandwichId._ref as the key (the actual product ID), not _key
          if (item.sandwichId && item.sandwichId._ref) {
            acc[item.sandwichId._ref] = item.selections;
          }
          return acc;
        },
        {}
      );
      // Replace the array with the reconstructed object.
      invoice.orderDetails.customSelection = customSelectionObject;
    }

    // Fetch sandwich options for the email (matching cron job)
    const sandwichOptions = await client.fetch(PRODUCT_QUERY);
    console.log(`Retrieved ${sandwichOptions.length} sandwich options`);

    // Prepare email data (matching cron job format exactly)
    const emailData = {
      quoteId: invoice.quoteId,
      email: invoice.orderDetails.email,
      fullName: invoice.orderDetails.name,
      orderDetails: {
        ...invoice.orderDetails,
        selectionType: invoice.orderDetails.selectionType || "custom",
        allergies: invoice.orderDetails.allergies || "",
        customSelection: invoice.orderDetails.customSelection || {},
        varietySelection: invoice.orderDetails.varietySelection || {
          vega: 0,
          nonVega: 0,
          vegan: 0,
        },
        addDrinks: invoice.orderDetails.addDrinks || false,
        drinks: invoice.orderDetails.drinks || null,
        paymentMethod: "invoice",
      },
      deliveryDetails: {
        deliveryDate: invoice.orderDetails.deliveryDate,
        deliveryTime: invoice.orderDetails.deliveryTime || "12:00",
        street: invoice.orderDetails.street || "",
        houseNumber: invoice.orderDetails.houseNumber || "",
        houseNumberAddition: invoice.orderDetails.houseNumberAddition || "",
        postalCode: invoice.orderDetails.postalCode || "",
        city: invoice.orderDetails.city || "",
        phoneNumber: invoice.orderDetails.phoneNumber || "",
      },
      companyDetails: invoice.companyDetails,
      amount: invoice.amount, // Pass the entire amount object
      dueDate: invoice.dueDate,
      sandwichOptions,
    };

    console.log("Sending invoice email to:", invoice.orderDetails.email);

    // Send the invoice email (matching cron job)
    const emailSent = await sendOrderConfirmation(emailData, true);

    if (emailSent) {
      console.log("Invoice email sent successfully");

      // If email is sent successfully, also create the Yuki invoice (matching cron job)
      if (process.env.YUKI_ENABLED === "true") {
        console.log(
          `Creating Yuki invoice for quote: ${invoice.quoteId}`
        );
        // We don't need to await this, it can run in the background
        createYukiInvoice(invoice.quoteId, invoice._id).catch((error) => {
          console.error(
            `Background Yuki invoice creation failed for ${invoice.quoteId}:`,
            error
          );
        });
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
