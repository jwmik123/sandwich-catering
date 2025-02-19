// app/actions/generateQuote.js
"use server";

import { client } from "@/sanity/lib/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import OrderPDF from "@/app/components/OrderPDF";

export async function generateQuote(formData, sandwichOptions) {
  try {
    const quoteId = `Q${nanoid(8)}`;

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      <OrderPDF
        orderData={formData}
        quoteId={quoteId}
        sandwichOptions={sandwichOptions}
      />
    );

    // Upload PDF to Sanity
    const pdfAsset = await client.assets.upload("file", pdfBuffer, {
      filename: `quote-${quoteId}.pdf`,
      contentType: "application/pdf",
    });

    // Create quote document in Sanity
    const quote = await client.create({
      _type: "quote",
      quoteId,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      orderDetails: {
        numberOfPeople: formData.numberOfPeople,
        sandwichesPerPerson: formData.sandwichesPerPerson,
        totalSandwiches: formData.totalSandwiches,
        selectionType: formData.selectionType,
        customSelection:
          formData.selectionType === "custom"
            ? Object.entries(formData.customSelection).map(
                ([sandwichId, selections]) => ({
                  sandwichId: { _type: "reference", _ref: sandwichId },
                  selections: selections.map((selection) => ({
                    breadType: selection.breadType,
                    sauce: selection.sauce,
                    quantity: selection.quantity,
                    subTotal: selection.subTotal,
                  })),
                })
              )
            : null,
        varietySelection:
          formData.selectionType === "variety"
            ? formData.varietySelection
            : null,
      },
      deliveryDetails: {
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime,
        address: {
          street: formData.street,
          houseNumber: formData.houseNumber,
          houseNumberAddition: formData.houseNumberAddition,
          postalCode: formData.postalCode,
          city: formData.city,
        },
      },
      companyDetails: formData.isCompany
        ? {
            companyName: formData.companyName,
            companyVAT: formData.companyVAT,
          }
        : null,
      status: "pending",
      pdfAsset: {
        _type: "file",
        asset: {
          _type: "reference",
          _ref: pdfAsset._id,
        },
      },
      createdAt: new Date().toISOString(),
    });

    revalidatePath("/"); // Revalidate the home page cache

    return {
      success: true,
      quoteId,
      pdfUrl: pdfAsset.url,
      quote,
    };
  } catch (error) {
    console.error("Error generating quote:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
