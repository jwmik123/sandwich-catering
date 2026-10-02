// Start changing the order of an issued invoice: creates the replacement
// invoice to edit in the Studio (see lib/amend-invoice.js, ADR 0004).
import { NextResponse } from "next/server";
import { createReplacementInvoice } from "@/lib/amend-invoice";

export async function POST(request) {
  try {
    const { invoiceId } = await request.json();
    if (!invoiceId) {
      return NextResponse.json({ success: false, error: "Missing invoiceId" }, { status: 400 });
    }
    const result = await createReplacementInvoice(invoiceId);
    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error) {
    console.error("❌ amend invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
