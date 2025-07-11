// app/api/test/yuki-invoice/route.js
import { NextResponse } from "next/server";
import { createYukiInvoice } from "@/lib/yuki-api";
import { client } from "@/sanity/lib/client";

export async function GET(request) {
  console.log("===== YUKI TEST INVOICE ENDPOINT HIT =====");

  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get("quoteId");
  const secret = searchParams.get("secret");

  // 1. Authenticate the request
  if (secret !== process.env.YUKI_TEST_SECRET) {
    console.error("❌ Unauthorized: Invalid or missing secret.");
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!quoteId) {
    return NextResponse.json(
      { success: false, error: "Missing quoteId parameter" },
      { status: 400 }
    );
  }

  console.log(`🧪 Running test for quote: ${quoteId}`);

  try {
    // 2. Find the corresponding invoice document in Sanity
    const invoice = await client.fetch(
      `*[_type == "invoice" && quoteId == $quoteId][0]`,
      { quoteId }
    );

    if (!invoice) {
      // If no invoice, check for a quote to handle cases before invoice creation
      const quote = await client.fetch(
        `*[_type == "quote" && quoteId == $quoteId][0]`,
        { quoteId }
      );
      if (!quote) {
        return NextResponse.json(
          {
            success: false,
            error: `No quote or invoice found for quoteId: ${quoteId}`,
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: `A quote was found, but no invoice has been created for it yet. Quote status: ${quote.status}`,
        },
        { status: 404 }
      );
    }

    // 3. Call the centralized Yuki creation function
    const result = await createYukiInvoice(quoteId, invoice._id);

    // 4. Return the result
    if (result.success) {
      return new Response(result.result, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Yuki test endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
