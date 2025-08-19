// app/api/webhooks/mollie/route.js - Enhanced with Yuki integration
import { createMollieClient } from "@mollie/api-client";
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { sendOrderSmsNotification } from "@/lib/sms";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { createYukiInvoice } from "@/lib/yuki-api";

const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_LIVE_API_KEY,
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
          console.log(
            "Payment paid - sending confirmation and processing Yuki"
          );
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

    // Fetch order details from Sanity using a more comprehensive query
    const order = await client.fetch(
      `*[_type == "quote" && quoteId == $quoteId][0]{
        _id,
        quoteId,
        name,
        email,
        phoneNumber,
        orderDetails {
          totalSandwiches,
          selectionType,
          customSelection,
          varietySelection,
          addDrinks,
          drinks,
          allergies
        },
        deliveryDetails {
          deliveryDate,
          deliveryTime,
          deliveryCost,
          address {
            street,
            houseNumber,
            houseNumberAddition,
            postalCode,
            city
          }
        },
        companyDetails {
          companyName,
          companyVAT
        },
        status,
        paymentStatus,
        createdAt,
        pdfAsset
      }`,
      { quoteId }
    );

    if (!order) {
      console.error(`Order with quoteId ${quoteId} not found for confirmation`);
      return;
    }

    console.log(
      "Order data fetched from Sanity:",
      JSON.stringify(order, null, 2)
    );

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

    // Calculate amounts using PaymentStep.jsx pattern
    const subtotalAmount = calculateOrderTotal(order.orderDetails); // Items only, VAT-exclusive
    const deliveryCost = order.deliveryDetails.deliveryCost || 0; // VAT-exclusive
    const vatAmount = Math.ceil((subtotalAmount + deliveryCost) * 0.09 * 100) / 100;
    const totalAmount = subtotalAmount + deliveryCost + vatAmount; // Consistent with InvoicePDF calculation
    
    console.log(`Amount calculation for quote ${quoteId}:`);
    console.log(`- Subtotal (items): €${subtotalAmount.toFixed(2)}`);
    console.log(`- Delivery cost: €${deliveryCost.toFixed(2)}`);
    console.log(`- VAT (9%): €${vatAmount.toFixed(2)}`);
    console.log(`- Total: €${totalAmount.toFixed(2)}`);
    
    const amountData = {
      subtotal: subtotalAmount,
      delivery: deliveryCost,
      vat: vatAmount,
      total: totalAmount,
    };

    // Create an invoice document in Sanity for consistency
    try {
      const deliveryDate = new Date(
        order.deliveryDetails.deliveryDate || Date.now()
      );
      const dueDate = new Date(deliveryDate);
      dueDate.setDate(deliveryDate.getDate() + 14);

      const invoicePayload = {
        _type: "invoice",
        quoteId: order.quoteId,
        referenceNumber: order.companyDetails?.referenceNumber || null,
        amount: amountData,
        status: "paid", // From Mollie
        dueDate: dueDate.toISOString(),
        companyDetails: order.companyDetails,
        orderDetails: order.orderDetails,
        createdAt: new Date().toISOString(),
      };

      const newInvoice = await client.create(invoicePayload);
      console.log(
        `Invoice document created in Sanity with ID: ${newInvoice._id}`
      );

      // Now, send this to Yuki
      if (process.env.YUKI_ENABLED === "true") {
        console.log(
          `Triggering Yuki invoice creation for quote: ${order.quoteId}`
        );
        // Run in the background, but log if it fails. No need to await.
        createYukiInvoice(order.quoteId, newInvoice._id).catch((error) => {
          console.error(
            `Background Yuki invoice creation failed for ${order.quoteId}:`,
            error
          );
        });
      } else {
        console.log("Yuki integration is disabled. Skipping invoice creation.");
      }
    } catch (invoiceError) {
      console.error(
        "Failed to create invoice document for paid order:",
        invoiceError
      );
      // Log error but don't block confirmation emails
    }

    // Create a properly formatted order object expected by the email/PDF components
    const formattedOrder = {
      quoteId: order.quoteId,
      email: order.email,
      phoneNumber: order.phoneNumber,
      fullName: order.name, // This will be used as fallback when no company name
      amount: amountData, // Pass the calculated amount data

      // Format orderDetails
      orderDetails: {
        totalSandwiches: order.orderDetails?.totalSandwiches || 0,
        selectionType: order.orderDetails?.selectionType || "variety",
        allergies: order.orderDetails?.allergies || "",
        deliveryCost: order.deliveryDetails?.deliveryCost || 0,
        addDrinks: order.orderDetails?.addDrinks || false,
        drinks: order.orderDetails?.drinks || null,
        varietySelection: order.orderDetails?.varietySelection || {},

        // Convert customSelection from Sanity array format to object format
        customSelection: {},
      },

      // Format deliveryDetails to match expected structure
      deliveryDetails: {
        deliveryDate:
          order.deliveryDetails?.deliveryDate || new Date().toISOString(),
        deliveryTime: order.deliveryDetails?.deliveryTime || "12:00",
        phoneNumber: order.phoneNumber || "",
        address: {
          street: order.deliveryDetails?.address?.street || "",
          houseNumber: order.deliveryDetails?.address?.houseNumber || "",
          houseNumberAddition:
            order.deliveryDetails?.address?.houseNumberAddition || "",
          postalCode: order.deliveryDetails?.address?.postalCode || "",
          city: order.deliveryDetails?.address?.city || "",
        },
      },

      // Format companyDetails
      companyDetails: order.companyDetails
        ? {
            name: order.companyDetails.companyName || "",
            vatNumber: order.companyDetails.companyVAT || "",
            address: {
              street: order.deliveryDetails?.address?.street || "",
              houseNumber: order.deliveryDetails?.address?.houseNumber || "",
              houseNumberAddition:
                order.deliveryDetails?.address?.houseNumberAddition || "",
              postalCode: order.deliveryDetails?.address?.postalCode || "",
              city: order.deliveryDetails?.address?.city || "",
            },
          }
        : null,

      // Add all other necessary fields
      status: order.status || "pending",
      sandwichOptions: sandwichOptions,
      createdAt: order.createdAt || new Date().toISOString(),
      paymentMethod: "online", // Since this is a paid webhook
    };

    // Set variety selection if available
    if (order.orderDetails?.varietySelection) {
      formattedOrder.orderDetails.varietySelection = {
        vega: order.orderDetails.varietySelection.vega || 0,
        nonVega: order.orderDetails.varietySelection.nonVega || 0,
        vegan: order.orderDetails.varietySelection.vegan || 0,
      };
    } else {
      formattedOrder.orderDetails.varietySelection = {
        vega: 0,
        nonVega: 0,
        vegan: 0,
      };
    }

    // Convert customSelection from Sanity array format to object format expected by components
    if (Array.isArray(order.orderDetails?.customSelection)) {
      console.log("Converting customSelection array format to object format");

      order.orderDetails.customSelection.forEach((item) => {
        if (item.sandwichId && item.sandwichId._ref) {
          formattedOrder.orderDetails.customSelection[item.sandwichId._ref] =
            Array.isArray(item.selections) ? item.selections : [];
        }
      });
    }

    console.log("Sending order confirmation with formatted data");
    console.log(
      "Delivery details:",
      JSON.stringify(formattedOrder.deliveryDetails, null, 2)
    );
    console.log(
      "Company details:",
      JSON.stringify(formattedOrder.companyDetails, null, 2)
    );

    await sendOrderConfirmation(formattedOrder, false);
    console.log(`Order confirmation sent for quote ${quoteId}`);

    // Send SMS notification directly
    await sendOrderSmsNotification(formattedOrder);
    console.log(`SMS notification sent for paid order ${quoteId}`);
  } catch (error) {
    console.error(`Error in handlePaidStatus for quote ${quoteId}:`, error);
    console.error("Error stack:", error.stack);
  }
}

// Keep other helper functions
async function sendPaymentFailureNotification(quoteId) {
  console.log(`Would send payment failure notification for ${quoteId}`);
  // Handle payment failure
}

async function handleExpiredPayment(quoteId) {
  console.log(`Would handle expired payment for ${quoteId}`);
  // Handle expired payment
}

async function handleCanceledPayment(quoteId) {
  // Logic for canceled payments
  console.log(`Handling canceled payment for quote ${quoteId}`);
}

// Helper function to calculate total from order data
function calculateOrderTotal(orderDetails) {
  if (!orderDetails) return 0;
  let total = 0;

  if (orderDetails.selectionType === "custom") {
    if (Array.isArray(orderDetails.customSelection)) {
      // Custom selection from Sanity is an array of objects
      total = orderDetails.customSelection
        .flatMap(item => item.selections || [])
        .reduce((sum, selection) => sum + (selection.subTotal || 0), 0);
    } else if (orderDetails.customSelection) {
      // If it's already an object (converted format)
      total = Object.values(orderDetails.customSelection || {})
        .flat()
        .reduce((sum, selection) => sum + (selection.subTotal || 0), 0);
    }
  } else {
    if (orderDetails.varietySelection) {
      const totalSandwiches =
        (orderDetails.varietySelection?.vega || 0) +
        (orderDetails.varietySelection?.nonVega || 0) +
        (orderDetails.varietySelection?.vegan || 0);
      total = totalSandwiches * 6.83;
    }
  }

  // Add drinks pricing if drinks are selected
  if (orderDetails.addDrinks && orderDetails.drinks) {
    const drinksTotal = 
      (orderDetails.drinks.verseJus || 0) * 3.62 +  // Fresh juice €3.62
      (orderDetails.drinks.sodas || 0) * 2.71 +     // Sodas €2.71
      (orderDetails.drinks.smoothies || 0) * 3.62;  // Smoothies €3.62
    total += drinksTotal;
  }

  return total;
}
