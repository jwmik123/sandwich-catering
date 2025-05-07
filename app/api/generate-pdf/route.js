import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "@/app/components/InvoicePDF";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const data = await request.json();

    const pdfBuffer = await renderToBuffer(
      <InvoicePDF
        quoteId={data.quoteId}
        orderDetails={data.orderDetails}
        deliveryDetails={{
          ...data.deliveryDetails,
          deliveryDate: data.deliveryDetails.deliveryDate,
        }}
        companyDetails={data.companyDetails}
        amount={data.amount}
        dueDate={new Date(data.dueDate)}
        sandwichOptions={data.sandwichOptions}
      />
    );

    // Convert buffer to base64
    const base64 = pdfBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      pdf: base64,
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
