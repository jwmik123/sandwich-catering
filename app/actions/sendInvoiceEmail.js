"use server";

import { client } from "@/sanity/lib/client";
import { sendOrderConfirmation } from "@/lib/email";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { createYukiInvoice } from "@/lib/yuki-api";

export async function sendInvoiceEmail(quoteId) {
  try {
    // Fetch the invoice from Sanity
    const invoice = await client.fetch(
      `*[_type == "invoice" && quoteId == $quoteId][0]`,
      { quoteId }
    );

    if (!invoice) {
      console.error("Invoice not found for quoteId:", quoteId);
      return { success: false, error: "Invoice not found" };
    }

    // Fetch sandwich options for the email
    const sandwichOptions = await client.fetch(PRODUCT_QUERY);

    // Prepare email data
    const emailData = {
      quoteId,
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

    // Send the invoice email
    const emailSent = await sendOrderConfirmation(emailData, true);

    if (emailSent) {
      // Create the invoice in Yuki
      if (process.env.YUKI_ENABLED === "true") {
        console.log(`Triggering Yuki invoice creation for quote: ${quoteId}`);
        // Run in the background, but log if it fails. No need to await.
        createYukiInvoice(quoteId, updatedQuote._id).catch((error) => {
          console.error(
            `Background Yuki invoice creation failed for ${quoteId}:`,
            error
          );
        });
      } else {
        console.log("Yuki integration is disabled. Skipping invoice creation.");
      }

      // Update the invoice status to indicate email was sent
      await client
        .patch(invoice._id)
        .set({ emailSent: true, emailSentAt: new Date().toISOString() })
        .commit();

      return { success: true };
    } else {
      return { success: false, error: "Failed to send invoice email" };
    }
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return { success: false, error: error.message };
  }
}
