// app/api/quotes/[quoteId]/route.js
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { quoteId } = await params;

  try {
    const quote = await client.fetch(
      `*[_type == "quote" && quoteId == $quoteId][0]{
        quoteId,
        orderDetails {
          totalSandwiches,
          selectionType,
          allergies,
          customSelection[] {
            sandwichId->{
              _id,
              name,
              price,
              category,
              dietaryType,
              hasSauceOptions,
              sauceOptions
            },
            selections[] {
              breadType,
              sauce,
              quantity,
              subTotal
            },
          },
          varietySelection {
            vega,
            nonVega,
            vegan
          }
        },
        deliveryDetails {
          deliveryDate,
          deliveryTime,
          address {
            street,
            houseNumber,
            houseNumberAddition,
            postalCode,
            city
          }
        },
        companyDetails {
          companyName,
          companyVAT
        },
        status,
        createdAt
      }`,
      { quoteId }
    );

    if (!quote) {
      return NextResponse.json({
        success: false,
        message: "Quote not found",
      });
    }

    return NextResponse.json({ success: true, quote });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json({
      success: false,
      message: "Something went wrong when fetching the quote",
    });
  }
}
