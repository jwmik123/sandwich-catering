// app/api/admin/yuki/route.js - Admin endpoint for manual Yuki operations
import { NextResponse } from "next/server";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";
import { client } from "@/sanity/lib/client";

export async function POST(request) {
  try {
    // Basic authentication check (you should implement proper admin auth)
    const authHeader = request.headers.get("authorization");
    const expectedToken =
      process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET;
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, quoteId, startDate, endDate } = await request.json();

    switch (action) {
      case "send-single":
        return await sendSingleInvoice(quoteId);

      case "send-batch":
        return await sendBatchInvoices(startDate, endDate);

      case "test-connection":
        return await testYukiConnection();

      case "sync-status":
        return await syncYukiStatus();

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin Yuki API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendSingleInvoice(quoteId) {
  if (!quoteId) {
    return NextResponse.json({ error: "QuoteId is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/yuki/send-invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId }),
      }
    );

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to send invoice: ${error.message}` },
      { status: 500 }
    );
  }
}

async function sendBatchInvoices(startDate, endDate) {
  try {
    // Get all paid quotes in date range that haven't been sent to Yuki
    const quotes = await client.fetch(
      `
      *[_type == "quote" && 
        paymentStatus == "paid" && 
        !defined(yukiSent) &&
        createdAt >= $startDate &&
        createdAt <= $endDate
      ]{quoteId, createdAt, paymentStatus}
    `,
      {
        startDate: startDate || "2024-01-01T00:00:00Z",
        endDate: endDate || new Date().toISOString(),
      }
    );

    console.log(`Found ${quotes.length} quotes to process`);

    const results = [];
    for (const quote of quotes) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/yuki/send-invoice`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ quoteId: quote.quoteId }),
          }
        );

        const result = await response.json();
        results.push({
          quoteId: quote.quoteId,
          success: result.success,
          error: result.error || null,
        });

        // Add delay to avoid overwhelming Yuki API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          quoteId: quote.quoteId,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Batch processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}

async function testYukiConnection() {
  try {
    const { apiKey, adminId } = validateYukiConfig();
    const yukiClient = new YukiApiClient(apiKey, adminId);

    const sessionId = await yukiClient.authenticate();

    return NextResponse.json({
      success: true,
      message: "Successfully connected to Yuki",
      sessionId: sessionId ? "✓" : "✗",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

async function syncYukiStatus() {
  try {
    // Get statistics about Yuki integration
    const stats = await client.fetch(`{
      "totalQuotes": count(*[_type == "quote"]),
      "paidQuotes": count(*[_type == "quote" && paymentStatus == "paid"]),
      "yukiSent": count(*[_type == "quote" && yukiSent == true]),
      "yukiPending": count(*[_type == "quote" && paymentStatus == "paid" && !defined(yukiSent)]),
      "invoicesTotal": count(*[_type == "invoice"]),
      "invoicesYukiSent": count(*[_type == "invoice" && yukiSent == true]),
      "invoicesYukiPending": count(*[_type == "invoice" && !defined(yukiSent)])
    }`);

    return NextResponse.json({
      success: true,
      stats,
      yukiEnabled: process.env.YUKI_ENABLED === "true",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get status: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET endpoint for status checks
export async function GET() {
  try {
    return await syncYukiStatus();
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
