// app/api/webhooks/mollie/route.js
import { createMollieClient } from "@mollie/api-client";
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { PRODUCT_QUERY } from "@/sanity/lib/queries"; // Make sure this import is correct

const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_TEST_API_KEY,
});

export async function POST(request) {
  try {
    // Get the payment ID from Mollie's webhook call
    const body = await request.formData();
    const paymentId = body.get("id");

    if (!paymentId) {
      return new NextResponse("No payment ID provided", { status: 400 });
    }

    // Fetch the payment details from Mollie
    const payment = await mollieClient.payments.get(paymentId);
    const { status, metadata } = payment;
    const { quoteId } = metadata;

    // First fetch the document to get its _id
    const document = await client.fetch(
      `*[_type == "quote" && quoteId == $quoteId][0]._id`,
      { quoteId }
    );

    if (!document) {
      console.error(`Quote with ID ${quoteId} not found`);
      return new NextResponse("Quote not found", { status: 404 });
    }

    // Update the order status in Sanity using the correct _id
    await client
      .patch(document)
      .set({
        paymentStatus: status,
        paymentId: paymentId,
        lastPaymentUpdate: new Date().toISOString(),
      })
      .commit();

    // Handle different payment statuses
    switch (status) {
      case "paid":
        // Payment completed successfully
        // Send confirmation email
        await handlePaidStatus(quoteId);
        break;
      case "failed":
        // Payment failed
        // Notify customer and/or support
        await sendPaymentFailureNotification(quoteId);
        break;
      case "expired":
        // Payment expired
        // Clean up the order or notify customer
        await handleExpiredPayment(quoteId);
        break;
      case "canceled":
        // Payment was canceled
        // Update order status and notify if needed
        await handleCanceledPayment(quoteId);
        break;
    }

    return new NextResponse("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    // Still return 200 to Mollie to acknowledge receipt
    // But log the error for your monitoring
    return new NextResponse("Webhook received", { status: 200 });
  }
}

// Helper functions for different payment statuses
async function handlePaidStatus(quoteId) {
  // Fetch order details from Sanity
  const order = await client.fetch(
    `*[_type == "quote" && quoteId == $quoteId][0]`,
    { quoteId }
  );

  if (order) {
    try {
      // Fetch sandwich options to include in the email
      console.log("Fetching sandwich options for order confirmation...");
      let sandwichOptions = [];
      try {
        sandwichOptions = await client.fetch(PRODUCT_QUERY);
        console.log(
          `Retrieved ${sandwichOptions.length} sandwich options from Sanity`
        );
      } catch (fetchError) {
        console.error("Error fetching sandwich options:", fetchError);
      }

      // Add sandwich options to the order object
      const orderWithSandwichOptions = {
        ...order,
        sandwichOptions,
      };

      await sendOrderConfirmation(orderWithSandwichOptions);
      console.log(`Order confirmation sent for quote ${quoteId}`);
    } catch (error) {
      console.error(
        `Failed to send order confirmation for quote ${quoteId}:`,
        error
      );
    }
  } else {
    console.error(`Order with quoteId ${quoteId} not found for confirmation`);
  }
  // Here you would:
  // 3. Send internal notification
  // 4. Update inventory if needed
}

// Keep other helper functions
async function sendPaymentFailureNotification(quoteId) {
  // Handle payment failure:
  // 1. Send email to customer about failed payment
  // 2. Provide instructions to try again
  // 3. Log incident for support team
}

async function handleExpiredPayment(quoteId) {
  // Handle expired payment:
  // 1. Update order status
  // 2. Release any held inventory
  // 3. Notify customer if needed
}

async function handleCanceledPayment(quoteId) {
  // Handle canceled payment:
  // 1. Update order status
  // 2. Release any held inventory
  // 3. Log cancellation
}
