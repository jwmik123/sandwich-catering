import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const { quoteId, amount, orderDetails } = await request.json();
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Update the quote in Sanity with invoice status
    const updatedQuote = await client.create({
      _type: "invoice",
      quoteId,
      amount: {
        total: amount,
        subtotal: amount / 1.09,
        vat: amount - amount / 1.09,
      },
      status: "pending",
      dueDate: dueDate.toISOString(),
      companyDetails: {
        name: orderDetails.companyName,
        vatNumber: orderDetails.companyVAT,
        address: {
          street: orderDetails.street,
          houseNumber: orderDetails.houseNumber,
          houseNumberAddition: orderDetails.houseNumberAddition,
          postalCode: orderDetails.postalCode,
          city: orderDetails.city,
        },
      },
      orderDetails,
      createdAt: new Date().toISOString(),
    });

    // Send invoice email with PDF
    if (orderDetails.email) {
      try {
        await sendInvoiceEmail({
          quoteId,
          email: orderDetails.email,
          orderDetails,
          deliveryDetails: {
            deliveryDate: orderDetails.deliveryDate,
            deliveryTime: orderDetails.deliveryTime,
            street: orderDetails.street,
            houseNumber: orderDetails.houseNumber,
            houseNumberAddition: orderDetails.houseNumberAddition,
            postalCode: orderDetails.postalCode,
            city: orderDetails.city,
          },
          companyDetails: {
            name: orderDetails.companyName,
            vatNumber: orderDetails.companyVAT,
            address: {
              street: orderDetails.street,
              houseNumber: orderDetails.houseNumber,
              houseNumberAddition: orderDetails.houseNumberAddition,
              postalCode: orderDetails.postalCode,
              city: orderDetails.city,
            },
          },
          amount: {
            total: amount,
            subtotal: amount / 1.09,
            vat: amount - amount / 1.09,
          },
          dueDate,
        });
      } catch (emailError) {
        console.error("Failed to send invoice email:", emailError);
        // Continue with the response even if email fails
      }
    }

    return NextResponse.json({
      success: true,
      invoice: updatedQuote,
    });
  } catch (error) {
    console.error("Invoice creation failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
