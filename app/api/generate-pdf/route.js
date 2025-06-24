import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "@/app/components/InvoicePDF";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const data = await request.json();

    // Calculate due date if not provided (14 days after delivery date)
    let dueDate = data.dueDate ? new Date(data.dueDate) : null;

    // If due date isn't provided, calculate it from delivery date
    if (!dueDate && data.deliveryDetails?.deliveryDate) {
      const deliveryDate = new Date(data.deliveryDetails.deliveryDate);
      dueDate = new Date(deliveryDate);
      dueDate.setDate(deliveryDate.getDate() + 14);
    } else if (!dueDate) {
      // Fallback to current date + 14 days if no delivery date
      dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }

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
        dueDate={dueDate}
        sandwichOptions={data.sandwichOptions}
        referenceNumber={data.companyDetails?.referenceNumber || null}
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
