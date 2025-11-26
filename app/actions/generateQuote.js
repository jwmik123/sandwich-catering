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
        // CustomSelection should ONLY contain sandwich selections (custom orders)
        customSelection:
          formData.selectionType === "custom" && formData.customSelection && Object.keys(formData.customSelection).length > 0
            ? Object.entries(formData.customSelection).map(
                ([sandwichId, selections]) => ({
                  _key: sandwichId,
                  sandwichId: { _type: "reference", _ref: sandwichId },
                  selections: selections.map((selection) => ({
                    _key: `${sandwichId}-${selection.breadType}-${Math.random()}`,
                    breadType: selection.breadType,
                    sauce: selection.sauce,
                    toppings: selection.toppings,
                    quantity: selection.quantity,
                    subTotal: selection.subTotal,
                  })),
                })
              )
            : null,
        // UpsellAddons for popup products (variety orders)
        upsellAddons: formData.upsellAddons
          ? formData.upsellAddons.map((addon) => ({
              _key: addon.id || `addon-${Math.random()}`,
              id: addon.id,
              name: addon.name,
              price: addon.price,
              quantity: addon.quantity,
              subTotal: addon.subTotal,
            }))
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
