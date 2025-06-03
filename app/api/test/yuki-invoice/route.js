// app/api/test/yuki-invoice/route.js
import { NextResponse } from "next/server";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";

export async function POST(request) {
  try {
    const { apiKey, adminId } = validateYukiConfig();
    const yukiClient = new YukiApiClient(apiKey, adminId);

    // FAKE test data
    const testOrderData = {
      name: "Test Klant",
      email: "test@example.com",
      phoneNumber: "06-12345678",
      companyName: "Test Company BV",
      companyVAT: "NL123456789B01",
      isCompany: false, // false = business

      // Address
      street: "Teststraat",
      houseNumber: "123",
      houseNumberAddition: "A",
      postalCode: "1234AB",
      city: "Amsterdam",

      // Order details
      selectionType: "custom",
      customSelection: {
        "fake-sandwich-1": [
          {
            quantity: 2,
            breadType: "pistolet",
            sauce: "mosterd",
            subTotal: 12.76,
          },
        ],
        "fake-sandwich-2": [
          {
            quantity: 1,
            breadType: "spelt",
            sauce: "truffelmayo",
            subTotal: 6.88,
          },
        ],
      },

      deliveryDate: "2025-01-15",
      deliveryTime: "12:00",
      deliveryCost: 8.95,
    };

    const testQuoteId = `TEST-${Date.now()}`;

    // Format for Yuki
    const { contactData, invoiceData } = yukiClient.formatInvoiceFromOrderData(
      testOrderData,
      testQuoteId,
      28.59 // Total amount
    );

    console.log("=== TEST DATA ===");
    console.log("Contact:", JSON.stringify(contactData, null, 2));
    console.log("Invoice:", JSON.stringify(invoiceData, null, 2));

    // Send to Yuki - skip contact creation and only create invoice with inline contact data
    // await yukiClient.createContact(contactData);
    await yukiClient.createSalesInvoice(invoiceData);

    return NextResponse.json({
      success: true,
      message: "Test invoice sent to Yuki!",
      testQuoteId,
      contactCode: contactData.contactCode,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
