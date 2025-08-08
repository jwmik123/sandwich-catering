// app/actions/generateQuote.js
"use server";

import { client } from "@/sanity/lib/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import OrderPDF from "@/app/components/OrderPDF";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 8);

export async function generateQuote(formData, sandwichOptions) {
  try {
    const quoteId = `Q${nanoid()}`;

    console.log("Generating quote with ID:", quoteId);
    console.log(
      "Sandwich options available:",
      sandwichOptions ? sandwichOptions.length : 0
    );

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      <OrderPDF
        orderData={formData}
        quoteId={quoteId}
        sandwichOptions={sandwichOptions} // Pass sandwich options to the PDF
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
      name: formData.name,
      orderDetails: {
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
                    toppings: selection.toppings,
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
        addDrinks: formData.addDrinks || false,
        drinks: formData.addDrinks ? formData.drinks : null,
        allergies: formData.allergies,
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
      invoiceDetails: {
        sameAsDelivery: formData.sameAsDelivery,
        address: formData.sameAsDelivery
          ? {
              street: formData.street,
              houseNumber: formData.houseNumber,
              houseNumberAddition: formData.houseNumberAddition,
              postalCode: formData.postalCode,
              city: formData.city,
            }
          : {
              street: formData.invoiceStreet,
              houseNumber: formData.invoiceHouseNumber,
              houseNumberAddition: formData.invoiceHouseNumberAddition,
              postalCode: formData.invoicePostalCode,
              city: formData.invoiceCity,
            },
      },
      companyDetails: formData.isCompany
        ? {
            companyName: formData.companyName,
            companyVAT: formData.companyVAT,
            referenceNumber: formData.referenceNumber,
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
