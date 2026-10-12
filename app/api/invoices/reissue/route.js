// Name / address changed on an issued invoice: credit it and send it again
// under a new number (see lib/amend-invoice.js, ADR 0004).
import { NextResponse } from "next/server";
import { reissueWithAddressee } from "@/lib/amend-invoice";

export async function POST(request) {
  try {
    const { invoiceId, addressee } = await request.json();
    if (!invoiceId || !addressee) {
      return NextResponse.json(
        { success: false, error: "Missing invoiceId or addressee" },
        { status: 400 }
      );
    }
    const result = await reissueWithAddressee(invoiceId, addressee);
    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error) {
    console.error("❌ reissue invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
