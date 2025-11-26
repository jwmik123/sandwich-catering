// app/api/create-invoice/route.js
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { PRODUCT_QUERY, DRINK_QUERY } from "@/sanity/lib/queries";
import { createYukiInvoice } from "@/lib/yuki-api";
import { getDrinksWithDetails } from "@/lib/product-helpers";

export async function POST(request) {
  console.log("===== CREATE INVOICE API CALLED =====");

  try {
    // Safely parse the request body
    let requestData;
    try {
      requestData = await request.json();
      console.log("Request data received successfully");
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
        },
        { status: 400 }
      );
    }

    const { quoteId, amount, orderDetails } = requestData || {};

    if (!quoteId || amount === undefined || !orderDetails) {
      console.error("Missing required fields in request:", {
        hasQuoteId: !!quoteId,
        hasAmount: amount !== undefined,
        hasOrderDetails: !!orderDetails,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // --- Data Transformation ---
    // Fetch drinks from Sanity to create drinksWithDetails
    let drinksWithDetails = [];
    if (orderDetails.drinks && Object.keys(orderDetails.drinks).length > 0) {
      try {
        console.log("Fetching drinks from Sanity...");
        const drinks = await client.fetch(DRINK_QUERY);
        drinksWithDetails = getDrinksWithDetails(orderDetails.drinks, drinks);
        console.log(`Created drinksWithDetails with ${drinksWithDetails.length} drinks`);
      } catch (drinkError) {
        console.error("Error fetching drinks:", drinkError);
      }
    }

    // Transform the incoming orderDetails to a structured format for Sanity
    const structuredOrderDetails = {
      ...orderDetails,
      // Ensure critical customer contact fields are included
      name: orderDetails.name || orderDetails.fullName || "",
      email: orderDetails.email || "",
      phoneNumber: orderDetails.phoneNumber || "",
      // Ensure delivery address fields are included (they might be at the top level of orderDetails)
      street: orderDetails.street || "",
      houseNumber: orderDetails.houseNumber || "",
      houseNumberAddition: orderDetails.houseNumberAddition || "",
      postalCode: orderDetails.postalCode || "",
      city: orderDetails.city || "",
      // Convert customSelection from an object to a structured array (custom orders only)
      customSelection:
        orderDetails.selectionType === "custom" && orderDetails.customSelection && Object.keys(orderDetails.customSelection).length > 0
          ? Object.entries(orderDetails.customSelection).map(
              ([sandwichId, selections]) => ({
                _key: sandwichId,
                sandwichId: { _type: "reference", _ref: sandwichId },
                selections: selections.map((selection) => ({
                  breadType: selection.breadType,
                  sauce: selection.sauce,
                  toppings: selection.toppings,
                  quantity: selection.quantity,
                  subTotal: selection.subTotal,
                  _key: `${sandwichId}-${selection.breadType || 'default'}-${Math.random()}`,
                })),
              })
            )
          : [],
      // Upsell addons (popup products for variety orders)
      upsellAddons: orderDetails.upsellAddons
        ? orderDetails.upsellAddons.map((addon) => ({
            _key: addon.id || addon._key || `addon-${Math.random()}`,
            id: addon.id,
            name: addon.name,
            price: addon.price,
            quantity: addon.quantity,
            subTotal: addon.subTotal,
          }))
        : [],
      // Ensure varietySelection is always an object
      varietySelection: orderDetails.varietySelection || {
        nonVega: 0,
        vega: 0,
        vegan: 0,
      },
      // Include drinks data
      addDrinks: drinksWithDetails.length > 0, // Set to true if there are drinks
      drinks: orderDetails.drinks || null,
      drinksWithDetails: drinksWithDetails, // Add the detailed drinks info
    };
    // --- End Data Transformation ---

    // Calculate due date (14 days from delivery date)
    const deliveryDate = new Date(orderDetails.deliveryDate || Date.now());
    const dueDate = new Date(deliveryDate);
    dueDate.setDate(deliveryDate.getDate() + 14);
    console.log(
      "Due date calculated:",
      dueDate.toISOString(),
      "based on delivery date:",
      deliveryDate.toISOString()
    );

    // Calculate amounts using PaymentStep.jsx pattern
    // The amount passed is the final total with VAT: (subtotal + delivery) * 1.09
    const finalTotal = Number(amount) || 0;
    const deliveryCost = orderDetails.deliveryCost || 0;
    
    // Reverse calculate to get the subtotal (items only, VAT-exclusive)  
    const subtotalAmount = (finalTotal / 1.09) - deliveryCost;
    const vatAmount = Math.ceil((subtotalAmount + deliveryCost) * 0.09 * 100) / 100;
    
    const amountData = {
      subtotal: subtotalAmount,
      delivery: deliveryCost,
      vat: vatAmount,
      total: finalTotal,
    };

    console.log("Creating invoice in Sanity with data:");
    console.log("- Quote ID:", quoteId);
    console.log("- Amount:", amountData);

    // Ensure we have valid company details
    // Use companyName if available (business order), otherwise use the person's name
    const companyDetails = {
      name: orderDetails.companyName || orderDetails.name || "Customer",
      referenceNumber: orderDetails.referenceNumber || null,
      address: {
        street: orderDetails.street || "",
        houseNumber: orderDetails.houseNumber || "",
        houseNumberAddition: orderDetails.houseNumberAddition || "",
        postalCode: orderDetails.postalCode || "",
        city: orderDetails.city || "",
      },
    };

    // Create invoice record in Sanity
    const updatedQuote = await client.create({
      _type: "invoice",
      quoteId,
      referenceNumber: orderDetails.referenceNumber || null,
      amount: amountData,
      status: "pending",
      dueDate: dueDate.toISOString(),
      companyDetails,
      orderDetails: structuredOrderDetails, // Use the new structured data
      createdAt: new Date().toISOString(),
    });

    console.log("Invoice created in Sanity with ID:", updatedQuote._id);

    // Send invoice to Yuki right away
    // if (process.env.YUKI_ENABLED === "true") {
    //   console.log(`Triggering Yuki invoice creation for quote: ${quoteId}`);
    //   // Run in the background, but log if it fails. No need to await.
    //   createYukiInvoice(quoteId, updatedQuote._id).catch((error) => {
    //     console.error(
    //       `Background Yuki invoice creation failed for ${quoteId}:`,
    //       error
    //     );
    //   });
    // } else {
    //   console.log("Yuki integration is disabled. Skipping invoice creation.");
    // }

    // Fetch the original quote to get properly structured customSelection with dereferenced sandwiches
    console.log("Fetching quote from Sanity to get dereferenced sandwich data...");
    let quoteData = null;
    try {
      quoteData = await client.fetch(
        `*[_type == "quote" && quoteId == $quoteId][0]{
          orderDetails {
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
                toppings,
                quantity,
                subTotal
              }
            },
            upsellAddons[] {
              id,
              name,
              price,
              quantity,
              subTotal
            }
          }
        }`,
        { quoteId }
      );
      console.log("Quote data fetched successfully");
    } catch (fetchError) {
      console.error("Error fetching quote:", fetchError);
    }

    // Fetch sandwich options to include in the email
    console.log("Fetching sandwich options for email...");
    let sandwichOptions = [];
    try {
      sandwichOptions = await client.fetch(PRODUCT_QUERY);
      console.log(
        `Retrieved ${sandwichOptions.length} sandwich options from Sanity`
      );
    } catch (fetchError) {
      console.error("Error fetching sandwich options:", fetchError);
      console.log("Will continue with empty sandwich options");
    }

    // Send order confirmation email without invoice
    if (orderDetails.email) {
      console.log(
        "Preparing to send order confirmation email to:",
        orderDetails.email
      );

      try {
        // Transform the array format from Sanity to the object format expected by email/PDF templates
        let customSelectionWithNames = orderDetails.customSelection || {};

        if (quoteData?.orderDetails?.customSelection && Array.isArray(quoteData.orderDetails.customSelection)) {
          // Convert array format to object format and inject sandwich names into selections
          customSelectionWithNames = {};
          quoteData.orderDetails.customSelection.forEach(item => {
            const sandwichId = item.sandwichId?._id;
            const sandwichName = item.sandwichId?.name;
            if (sandwichId && item.selections) {
              // Map selections and add sandwich name to each one
              customSelectionWithNames[sandwichId] = item.selections.map(sel => ({
                ...sel,
                sandwichName: sandwichName, // Add sandwich name to selection
                sandwichId: sandwichId, // Add sandwich ID to selection
              }));
            }
          });
          console.log("Transformed customSelection with sandwich names for email");
        }

        // Prepare email data with explicitly structured objects
        const emailData = {
          quoteId,
          email: orderDetails.email,
          fullName: orderDetails.name,
          orderDetails: {
            ...orderDetails,
            // Ensure these exist with defaults
            selectionType: orderDetails.selectionType || "custom",
            allergies: orderDetails.allergies || "",
            // Use the properly dereferenced customSelection from the quote
            customSelection: customSelectionWithNames,
            // Include upsell addons from the quote
            upsellAddons: quoteData?.orderDetails?.upsellAddons || orderDetails.upsellAddons || [],
            varietySelection: orderDetails.varietySelection || {
              vega: 0,
              nonVega: 0,
              vegan: 0,
            },
            addDrinks: structuredOrderDetails.addDrinks, // Use structured data with correct flag
            drinks: structuredOrderDetails.drinks,
            drinksWithDetails: structuredOrderDetails.drinksWithDetails, // Include drinks details
            paymentMethod: "invoice", // Add payment method
          },
          deliveryDetails: {
            deliveryDate: orderDetails.deliveryDate || new Date().toISOString(),
            deliveryTime: orderDetails.deliveryTime || "12:00",
            street: orderDetails.street || "",
            houseNumber: orderDetails.houseNumber || "",
            houseNumberAddition: orderDetails.houseNumberAddition || "",
            postalCode: orderDetails.postalCode || "",
            city: orderDetails.city || "",
            phoneNumber: orderDetails.phoneNumber || "",
          },
          companyDetails,
          amount: amountData,
          dueDate,
          sandwichOptions,
        };

        console.log("Sending order confirmation email...");
        console.log("Drinks data being sent to email:", {
          addDrinks: emailData.orderDetails.addDrinks,
          drinks: emailData.orderDetails.drinks,
          drinksWithDetails: emailData.orderDetails.drinksWithDetails
        });
        const emailSent = await sendOrderConfirmation(emailData, false);

        if (emailSent) {
          console.log("Order confirmation email sent successfully");
        } else {
          console.error(
            "Failed to send order confirmation email - returned false"
          );
          // Add this to the response to inform the client
          return NextResponse.json({
            success: false,
            error: "Failed to send order confirmation email",
            invoice: updatedQuote,
          });
        }
      } catch (emailError) {
        console.error(
          "Failed to send order confirmation email - exception:",
          emailError
        );
        console.error("Error stack:", emailError.stack);
        // Return error response to client
        return NextResponse.json({
          success: false,
          error: "Failed to send order confirmation email",
          invoice: updatedQuote,
        });
      }
    } else {
      console.warn(
        "No email address provided, skipping order confirmation email"
      );
    }

    console.log("===== CREATE INVOICE API COMPLETED SUCCESSFULLY =====");
    return NextResponse.json({
      success: true,
      invoice: updatedQuote,
    });
  } catch (error) {
    console.error("Invoice creation failed:", error);
    console.error("Error stack:", error.stack);
    console.log("===== CREATE INVOICE API FAILED =====");
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
