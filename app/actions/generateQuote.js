// app/actions/generateQuote.js
"use server";

import { client } from "@/sanity/lib/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import OrderPDF from "@/app/components/OrderPDF";
import { DRINK_QUERY } from "@/sanity/lib/queries";
import { getDrinksWithDetails } from "@/lib/product-helpers";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 8);

export async function generateQuote(formData, sandwichOptions) {
  try {
    const quoteId = `Q${nanoid()}`;

    console.log("Generating quote with ID:", quoteId);
    console.log(
      "Sandwich options available:",
      sandwichOptions ? sandwichOptions.length : 0
    );

    // Fetch drinks from Sanity
    const drinks = await client.fetch(DRINK_QUERY);

    // Get drinks with details for storage
    const drinksWithDetails = getDrinksWithDetails(formData.drinks, drinks);

    // Transform drinks object to use camelCase for Sanity (backwards compatibility)
    // Convert slug-based keys to camelCase: "fresh-orange-juice" -> "freshOrangeJuice"
    const transformedDrinks = {};
    if (formData.drinks) {
      Object.entries(formData.drinks).forEach(([key, value]) => {
        // Convert kebab-case to camelCase
        const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        transformedDrinks[camelKey] = value;
      });
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      <OrderPDF
        orderData={formData}
        quoteId={quoteId}
        sandwichOptions={sandwichOptions} // Pass sandwich options to the PDF
        drinksWithDetails={drinksWithDetails} // Pass drinks details to PDF
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
      howDidYouFindUs: formData.howDidYouFindUs || [],
      howDidYouFindUsOther: formData.howDidYouFindUsOther || "",
      orderDetails: {
        totalSandwiches: formData.totalSandwiches,
        selectionType: formData.selectionType,
        customSelection:
          formData.customSelection && Object.keys(formData.customSelection).length > 0
            ? Object.entries(formData.customSelection).map(
                ([key, selections]) => {
                  // Determine if this is a sandwichId (UUID format) or categorySlug (readable string)
                  // Sanity document IDs are UUIDs with dashes in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                  const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

                  if (isUuidFormat) {
                    // Custom order format - use sandwichId reference
                    return {
                      sandwichId: { _type: "reference", _ref: key },
                      selections: selections.map((selection) => ({
                        breadType: selection.breadType,
                        sauce: selection.sauce,
                        toppings: selection.toppings,
                        quantity: selection.quantity,
                        subTotal: selection.subTotal,
                      })),
                    };
                  } else {
                    // Popup product format - use categorySlug
                    return {
                      categorySlug: key,
                      selections: selections.map((selection) => ({
                        id: selection.id,
                        name: selection.name,
                        price: selection.price,
                        quantity: selection.quantity,
                        subTotal: selection.subTotal,
                      })),
                    };
                  }
                }
              )
            : null,
        varietySelection:
          formData.selectionType === "variety"
            ? formData.varietySelection
            : null,
        addDrinks: true,
        drinks: transformedDrinks || null, // Use transformed camelCase keys for Sanity
        drinksWithDetails: drinksWithDetails, // Store drinks with names and prices
        allergies: formData.allergies,
      },
      deliveryDetails: {
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime,
        deliveryCost: formData.deliveryCost || 0,
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
