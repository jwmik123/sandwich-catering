// Sends branded payment reminders for selected overdue invoices.
// Triggered manually from the Studio "Reminders" tool. Reuses the invoice email
// + branded PDF (never Yuki's), stamps reminderSentAt. Does NOT re-book Yuki.
import { client } from "@/sanity/lib/client";
import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";

async function sendOneReminder(invoiceId, sandwichOptions) {
  const invoice = await client
    .withConfig({ useCdn: false })
    .fetch(`*[_type == "invoice" && _id == $invoiceId][0]`, { invoiceId });

  if (!invoice) return { invoiceId, success: false, error: "Invoice not found" };
  if (!invoice.orderDetails?.email) {
    return { invoiceId, success: false, error: "No email address" };
  }

  // Normalise customSelection array -> object (matching the invoice email path).
  if (
    invoice.orderDetails.selectionType === "custom" &&
    Array.isArray(invoice.orderDetails.customSelection)
  ) {
    invoice.orderDetails.customSelection =
      invoice.orderDetails.customSelection.reduce((acc, item) => {
        if (item.sandwichId && item.sandwichId._ref) {
          acc[item.sandwichId._ref] = item.selections;
        }
        return acc;
      }, {});
  }

  const emailData = {
    quoteId: invoice.quoteId,
    invoiceNumber: invoice.invoiceNumber || null,
    email: invoice.orderDetails.email,
    fullName: invoice.orderDetails.name,
    orderDetails: {
      ...invoice.orderDetails,
      selectionType: invoice.orderDetails.selectionType || "custom",
      allergies: invoice.orderDetails.allergies || "",
      customSelection: invoice.orderDetails.customSelection || {},
      varietySelection: invoice.orderDetails.varietySelection || {
        vega: 0,
        nonVega: 0,
        vegan: 0,
      },
      addDrinks: invoice.orderDetails.addDrinks || false,
      drinks: invoice.orderDetails.drinks || null,
      paymentMethod: "invoice",
    },
    deliveryDetails: {
      deliveryDate: invoice.orderDetails.deliveryDate,
      deliveryTime: invoice.orderDetails.deliveryTime || "12:00",
      phoneNumber: invoice.orderDetails.phoneNumber || "",
      address: {
        street: invoice.orderDetails.street || "",
        houseNumber: invoice.orderDetails.houseNumber || "",
        houseNumberAddition: invoice.orderDetails.houseNumberAddition || "",
        postalCode: invoice.orderDetails.postalCode || "",
        city: invoice.orderDetails.city || "",
      },
    },
    invoiceDetails: { address: invoice.companyDetails?.address || {} },
    companyDetails: {
      ...invoice.companyDetails,
      referenceNumber: invoice.referenceNumber || null,
    },
    amount: invoice.amount,
    dueDate: invoice.dueDate,
    sandwichOptions,
  };

  const sent = await sendOrderConfirmation(emailData, true, true); // isInvoiceEmail, isReminder
  if (!sent) return { invoiceId, success: false, error: "Email send failed" };

  await client
    .patch(invoice._id)
    .set({ reminderSentAt: new Date().toISOString() })
    .commit();

  return { invoiceId, success: true, email: invoice.orderDetails.email };
}

export async function POST(request) {
  try {
    const { invoiceIds } = await request.json();
    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "invoiceIds (non-empty array) required" },
        { status: 400 }
      );
    }

    const sandwichOptions = await client.fetch(PRODUCT_QUERY);

    const results = await Promise.allSettled(
      invoiceIds.map((id) => sendOneReminder(id, sandwichOptions))
    );

    const normalized = results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : { invoiceId: invoiceIds[i], success: false, error: String(r.reason) }
    );
    const sent = normalized.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      sent,
      failed: normalized.length - sent,
      results: normalized,
    });
  } catch (error) {
    console.error("send-reminders failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
