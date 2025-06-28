// app/api/yuki/send-invoice/route.js
import { NextResponse } from "next/server";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";

export async function POST(request) {
  console.log("===== YUKI SEND INVOICE API CALLED =====");

  try {
    // Validate Yuki configuration
    const { apiKey, adminId } = validateYukiConfig();

    // Parse request data
    const { quoteId, invoiceId } = await request.json();

    if (!quoteId) {
      return NextResponse.json(
        { success: false, error: "Missing quoteId" },
        { status: 400 }
      );
    }

    console.log(`Processing Yuki invoice for quote: ${quoteId}`);

    // Fetch invoice data from Sanity
    let orderData;
    if (invoiceId) {
      // Get data from invoice document
      orderData = await client.fetch(
        `*[_type == "invoice" && _id == $invoiceId][0]{
          quoteId,
          amount,
          orderDetails,
          companyDetails,
          createdAt
        }`,
        { invoiceId }
      );

      if (!orderData) {
        return NextResponse.json(
          { success: false, error: "Invoice not found" },
          { status: 404 }
        );
      }

      // Flatten the structure for processing
      orderData = {
        ...orderData.orderDetails,
        amount: orderData.amount,
        companyName: orderData.companyDetails?.name,
        companyVAT: orderData.companyDetails?.companyVAT,
        referenceNumber: orderData.companyDetails?.referenceNumber,
        isCompany: !!orderData.companyDetails?.name,
        paymentMethod: "invoice",
      };
    } else {
      // Get data from quote document
      orderData = await client.fetch(
        `*[_type == "quote" && quoteId == $quoteId][0]{
          quoteId,
          email,
          phoneNumber,
          orderDetails,
          deliveryDetails,
          companyDetails,
          status,
          paymentStatus,
          createdAt
        }`,
        { quoteId }
      );

      if (!orderData) {
        return NextResponse.json(
          { success: false, error: "Quote not found" },
          { status: 404 }
        );
      }

      // Flatten the structure for processing
      orderData = {
        ...orderData.orderDetails,
        email: orderData.email,
        phoneNumber: orderData.phoneNumber,
        deliveryDate: orderData.deliveryDetails?.deliveryDate,
        deliveryTime: orderData.deliveryDetails?.deliveryTime,
        street: orderData.deliveryDetails?.address?.street,
        houseNumber: orderData.deliveryDetails?.address?.houseNumber,
        houseNumberAddition:
          orderData.deliveryDetails?.address?.houseNumberAddition,
        postalCode: orderData.deliveryDetails?.address?.postalCode,
        city: orderData.deliveryDetails?.address?.city,
        companyName: orderData.companyDetails?.companyName,
        companyVAT: orderData.companyDetails?.companyVAT,
        referenceNumber: orderData.companyDetails?.referenceNumber,
        isCompany: !!orderData.companyDetails,
        paymentMethod: orderData.paymentStatus ? "online" : "invoice",
      };
    }

    // Get sandwich options for proper naming
    const sandwichOptions = await client.fetch(PRODUCT_QUERY);

    // Initialize Yuki client
    const yukiClient = new YukiApiClient(apiKey, adminId);

    // Format the data for Yuki
    const { contactData, invoiceData } = yukiClient.formatInvoiceFromOrderData(
      orderData,
      quoteId,
      orderData.amount || calculateOrderTotal(orderData),
      sandwichOptions
    );

    // TEMPORARY LOGGING: Remove after testing
    console.log(
      "--- YUKI INVOICE DATA (FOR DEBUGGING) ---",
      JSON.stringify(invoiceData, null, 2)
    );
    // END TEMPORARY LOGGING

    console.log(
      "Sending invoice to Yuki with inline contact data:",
      invoiceData.reference
    );

    // Create sales invoice in Yuki with inline contact data
    const invoiceResult = await yukiClient.createSalesInvoice(invoiceData);

    console.log("✅ Invoice sent to Yuki successfully");

    // Update the quote/invoice in Sanity to mark as sent to Yuki
    if (invoiceId) {
      await client
        .patch(invoiceId)
        .set({
          yukiSent: true,
          yukiSentAt: new Date().toISOString(),
          yukiContactCode: contactData.contactCode,
          yukiInvoiceReference: invoiceData.reference,
        })
        .commit();
    } else {
      // Update the quote document
      const quoteDoc = await client.fetch(
        `*[_type == "quote" && quoteId == $quoteId][0]._id`,
        { quoteId }
      );

      if (quoteDoc) {
        await client
          .patch(quoteDoc)
          .set({
            yukiSent: true,
            yukiSentAt: new Date().toISOString(),
            yukiContactCode: contactData.contactCode,
            yukiInvoiceReference: invoiceData.reference,
          })
          .commit();
      }
    }

    console.log("===== YUKI SEND INVOICE COMPLETED SUCCESSFULLY =====");

    return NextResponse.json({
      success: true,
      yukiContactCode: contactData.contactCode,
      yukiInvoiceReference: invoiceData.reference,
      message: "Invoice successfully sent to Yuki",
    });
  } catch (error) {
    console.error("Yuki integration error:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send invoice to Yuki",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate total from order data
function calculateOrderTotal(orderData) {
  if (orderData.selectionType === "custom") {
    return Object.values(orderData.customSelection || {})
      .flat()
      .reduce((total, selection) => total + (selection.subTotal || 0), 0);
  } else {
    const totalSandwiches =
      (orderData.varietySelection?.vega || 0) +
      (orderData.varietySelection?.nonVega || 0) +
      (orderData.varietySelection?.vegan || 0);
    return totalSandwiches * 6.38;
  }
}
