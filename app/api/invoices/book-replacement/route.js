// Book a replacement invoice without mailing the customer: credits the old
// invoice and books the new one in Yuki (see lib/amend-invoice.js, ADR 0004).
import { NextResponse } from "next/server";
import { sendReplacementInvoice } from "@/lib/amend-invoice";

export async function POST(request) {
  try {
    const { invoiceId } = await request.json();
    if (!invoiceId) {
      return NextResponse.json({ success: false, error: "Missing invoiceId" }, { status: 400 });
    }
    const result = await sendReplacementInvoice(invoiceId, { email: false });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error("❌ book replacement error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
