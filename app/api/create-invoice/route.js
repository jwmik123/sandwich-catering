// app/api/create-invoice/route.js
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(request) {
  console.log("===== CREATE INVOICE API CALLED =====");

  try {
    // Safely parse the request body
    let requestData;
    try {
      requestData = await request.json();
      console.log("Request data received successfully");
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
        },
        { status: 400 }
      );
    }

    const { quoteId, amount, orderDetails } = requestData || {};

    if (!quoteId || amount === undefined || !orderDetails) {
      console.error("Missing required fields in request:", {
        hasQuoteId: !!quoteId,
        hasAmount: amount !== undefined,
        hasOrderDetails: !!orderDetails,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Calculate due date (14 days from now)
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    console.log("Due date calculated:", dueDate.toISOString());

    // Format amount for Sanity
    const amountData = {
      total: Number(amount) || 0,
      subtotal: (Number(amount) || 0) / 1.09,
      vat: (Number(amount) || 0) - (Number(amount) || 0) / 1.09,
    };

    console.log("Creating invoice in Sanity with data:");
    console.log("- Quote ID:", quoteId);
    console.log("- Amount:", amountData);

    // Ensure we have valid company details
    const companyDetails = {
      name: orderDetails.companyName || "Unknown Company",
      vatNumber: orderDetails.companyVAT || "N/A",
      address: {
        street: orderDetails.street || "",
        houseNumber: orderDetails.houseNumber || "",
        houseNumberAddition: orderDetails.houseNumberAddition || "",
        postalCode: orderDetails.postalCode || "",
        city: orderDetails.city || "",
      },
    };

    // Create invoice record in Sanity
    const updatedQuote = await client.create({
      _type: "invoice",
      quoteId,
      amount: amountData,
      status: "pending",
      dueDate: dueDate.toISOString(),
      companyDetails,
      orderDetails,
      createdAt: new Date().toISOString(),
    });

    console.log("Invoice created in Sanity with ID:", updatedQuote._id);

    // Send invoice email with PDF
    if (orderDetails.email) {
      console.log("Preparing to send invoice email to:", orderDetails.email);

      try {
        // Prepare email data with explicitly structured objects
        const emailData = {
          quoteId,
          email: orderDetails.email,
          orderDetails: {
            ...orderDetails,
            // Ensure these exist with defaults
            selectionType: orderDetails.selectionType || "custom",
            allergies: orderDetails.allergies || "",
            customSelection: orderDetails.customSelection || {},
            varietySelection: orderDetails.varietySelection || {
              vega: 0,
              nonVega: 0,
              vegan: 0,
            },
          },
          deliveryDetails: {
            deliveryDate: orderDetails.deliveryDate || new Date().toISOString(),
            deliveryTime: orderDetails.deliveryTime || "12:00",
            street: orderDetails.street || "",
            houseNumber: orderDetails.houseNumber || "",
            houseNumberAddition: orderDetails.houseNumberAddition || "",
            postalCode: orderDetails.postalCode || "",
            city: orderDetails.city || "",
          },
          companyDetails,
          amount: amountData,
          dueDate,
        };

        console.log("Sending email with structured data...");
        const emailSent = await sendInvoiceEmail(emailData);

        if (emailSent) {
          console.log("Invoice email sent successfully");
        } else {
          console.error("Failed to send invoice email - returned false");
        }
      } catch (emailError) {
        console.error("Failed to send invoice email - exception:", emailError);
        console.error("Error stack:", emailError.stack);
        // Continue with the response even if email fails
      }
    } else {
      console.warn("No email address provided, skipping invoice email");
    }

    console.log("===== CREATE INVOICE API COMPLETED SUCCESSFULLY =====");
    return NextResponse.json({
      success: true,
      invoice: updatedQuote,
    });
  } catch (error) {
    console.error("Invoice creation failed:", error);
    console.error("Error stack:", error.stack);
    console.log("===== CREATE INVOICE API FAILED =====");
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
