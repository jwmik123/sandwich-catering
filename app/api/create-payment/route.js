import { createMollieClient } from "@mollie/api-client";
import { NextResponse } from "next/server";

const mollieClient = createMollieClient({
  apiKey: process.env.MOLLIE_LIVE_API_KEY,
});

export async function POST(request) {
  try {
    const { quoteId, amount, orderDetails } = await request.json();

    // Create payment
    const payment = await mollieClient.payments.create({
      amount: {
        currency: "EUR",
        value: amount.toFixed(2), // Format as string with 2 decimals
      },
      description: `Order ${quoteId}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?quoteId=${quoteId}&formData=${orderDetails}`,
      webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mollie`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}`,
      metadata: {
        quoteId,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: payment.getCheckoutUrl(),
    });
  } catch (error) {
    console.error("Payment creation failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
