// app/api/webhooks/mollie/route.js - Add this import
import { sendOrderSmsNotification } from "@/lib/sms";

// ... existing imports ...

// In the handlePaidStatus function, add SMS notification
async function handlePaidStatus(quoteId) {
  try {
    console.log(`Handling paid status for quote ${quoteId}`);

    // Fetch order details from Sanity using a more comprehensive query
    const order = await client.fetch(
      `*[_type == "quote" && quoteId == $quoteId][0]{
        _id,
        quoteId,
        email,
        phoneNumber,
        orderDetails {
          totalSandwiches,
          selectionType,
          customSelection,
          varietySelection,
          allergies
        },
        deliveryDetails {
          deliveryDate,
          deliveryTime,
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

    // Create a properly formatted order object expected by the email/PDF components
    const formattedOrder = {
      quoteId: order.quoteId,
      email: order.email,
      phoneNumber: order.phoneNumber,

      // ... rest of the formatting code ...
    };

    // ... rest of the existing code ...

    await sendOrderConfirmation(formattedOrder);
    console.log(`Order confirmation sent for quote ${quoteId}`);

    // Also send an SMS notification
    await sendOrderSmsNotification(formattedOrder);
    console.log(`SMS notification sent for paid order ${quoteId}`);
  } catch (error) {
    console.error(`Error in handlePaidStatus for quote ${quoteId}:`, error);
    console.error("Error stack:", error.stack);
  }
}
