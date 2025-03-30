// app/api/webhooks/mollie/route.js - Enhanced with better error handling
import { createMollieClient } from "@mollie/api-client";
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";

const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_TEST_API_KEY,
});

export async function POST(request) {
  try {
    console.log("===== MOLLIE WEBHOOK RECEIVED =====");

    // Get the payment ID from Mollie's webhook call
    const body = await request.formData();
    const paymentId = body.get("id");

    if (!paymentId) {
      console.error("No payment ID provided in webhook");
      return new NextResponse("No payment ID provided", { status: 400 });
    }

    console.log("Payment ID received:", paymentId);

    try {
      // Fetch the payment details from Mollie
      const payment = await mollieClient.payments.get(paymentId);
      const { status, metadata } = payment;
      const { quoteId } = metadata || {};

      if (!quoteId) {
        console.error("No quoteId found in payment metadata");
        return new NextResponse("Missing quoteId in payment metadata", {
          status: 400,
        });
      }

      console.log(`Payment status: ${status}, Quote ID: ${quoteId}`);

      // First fetch the document to get its _id
      const document = await client.fetch(
        `*[_type == "quote" && quoteId == $quoteId][0]._id`,
        { quoteId }
      );

      if (!document) {
        console.error(`Quote with ID ${quoteId} not found in Sanity`);
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

      console.log(`Updated payment status in Sanity to: ${status}`);

      // Handle different payment statuses
      switch (status) {
        case "paid":
          // Payment completed successfully
          console.log("Payment paid - sending confirmation");
          await handlePaidStatus(quoteId);
          break;
        case "failed":
          console.log("Payment failed - sending notification");
          await sendPaymentFailureNotification(quoteId);
          break;
        case "expired":
          console.log("Payment expired - handling expired payment");
          await handleExpiredPayment(quoteId);
          break;
        case "canceled":
          console.log("Payment canceled - handling cancelation");
          await handleCanceledPayment(quoteId);
          break;
        default:
          console.log(`Unhandled payment status: ${status}`);
      }

      return new NextResponse("Webhook processed", { status: 200 });
    } catch (error) {
      console.error("Error processing payment details:", error);
      console.error("Error stack:", error.stack);
      // Still return 200 to Mollie to acknowledge receipt
      return new NextResponse("Webhook received with errors", { status: 200 });
    }
  } catch (error) {
    console.error("Webhook processing failed:", error);
    console.error("Error stack:", error.stack);
    // Still return 200 to Mollie to acknowledge receipt
    return new NextResponse("Webhook received", { status: 200 });
  }
}

// Helper functions for different payment statuses
async function handlePaidStatus(quoteId) {
  try {
    console.log(`Handling paid status for quote ${quoteId}`);

    // Fetch order details from Sanity
    const order = await client.fetch(
      `*[_type == "quote" && quoteId == $quoteId][0]`,
      { quoteId }
    );

    if (!order) {
      console.error(`Order with quoteId ${quoteId} not found for confirmation`);
      return;
    }

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
      console.log("Will continue with empty sandwich options array");
    }

    // Add sandwich options to the order object with safeguards
    const orderWithSandwichOptions = {
      ...order,
      orderDetails: {
        ...order.orderDetails,
        // Fix for customSelection - ensure it's always a valid object
        customSelection: order.orderDetails?.customSelection || {},
      },
      // Ensure sandwichOptions is a valid array
      sandwichOptions: Array.isArray(sandwichOptions) ? sandwichOptions : [],
    };

    // Safely handle nested structure format differences
    if (order.orderDetails?.customSelection) {
      console.log("Checking customSelection structure...");

      // Check if customSelection is an array (from Sanity) or object (from form)
      if (Array.isArray(order.orderDetails.customSelection)) {
        console.log(
          "customSelection is an array - converting to object format"
        );

        // Convert from Sanity array format to the format expected by email components
        const convertedSelection = {};

        order.orderDetails.customSelection.forEach((item) => {
          if (item.sandwichId && item.sandwichId._ref) {
            convertedSelection[item.sandwichId._ref] = item.selections || [];
          }
        });

        orderWithSandwichOptions.orderDetails.customSelection =
          convertedSelection;
      }
    }

    console.log("Sending order confirmation...");
    await sendOrderConfirmation(orderWithSandwichOptions);
    console.log(`Order confirmation sent for quote ${quoteId}`);
  } catch (error) {
    console.error(`Error in handlePaidStatus for quote ${quoteId}:`, error);
    console.error("Error stack:", error.stack);
  }
}

// Keep other helper functions
async function sendPaymentFailureNotification(quoteId) {
  console.log(`Would send payment failure notification for ${quoteId}`);
  // Handle payment failure:
  // 1. Send email to customer about failed payment
  // 2. Provide instructions to try again
  // 3. Log incident for support team
}

async function handleExpiredPayment(quoteId) {
  console.log(`Would handle expired payment for ${quoteId}`);
  // Handle expired payment:
  // 1. Update order status
  // 2. Release any held inventory
  // 3. Notify customer if needed
}

async function handleCanceledPayment(quoteId) {
  console.log(`Would handle canceled payment for ${quoteId}`);
  // Handle canceled payment:
  // 1. Update order status
  // 2. Release any held inventory
  // 3. Log cancellation
}
