// lib/email.js
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "@/app/components/InvoicePDF";
import { sendOrderSmsNotification, sendSmsNotification } from "./sms";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_CONSTANTS = {
  // IMPORTANT: This must match the domain you've verified in Resend
  VERIFIED_DOMAIN: "catering.thesandwichbar.nl",
  SENDER_NAME: "The Sandwich Bar",
  FROM_EMAIL: function () {
    return `${this.SENDER_NAME} <orders@${this.VERIFIED_DOMAIN}>`;
  },
  ADMIN_EMAIL: "orders@thesandwichbar.nl",
  EMAIL_SUBJECTS: {
    ORDER_CONFIRMATION: (quoteId) => `Order Confirmation - ${quoteId}`,
    INVOICE: (quoteId) => `Invoice for Order ${quoteId}`,
  },
};

function getOrderConfirmationHtml({
  quoteId,
  orderDetails,
  deliveryDetails,
  companyDetails,
  totalAmount,
  sandwichOptions = [], // Added sandwichOptions parameter
}) {
  // Helper function to find sandwich name by ID
  const getSandwichName = (sandwichId) => {
    const sandwich = sandwichOptions.find((s) => s._id === sandwichId);
    return sandwich ? sandwich.name : "Unknown Sandwich";
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank you for your order at The Sandwich Bar</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="
        background-color: #f6f9fc;
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
        margin: 0;
        padding: 0;
      ">
        <div style="
          background-color: #ffffff;
          margin: 0 auto;
          max-width: 600px;
          padding: 20px;
        ">
          <h1 style="
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
          ">
            Order Confirmation
          </h1>

          <p style="
            font-size: 16px;
            line-height: 24px;
            color: #4b5563;
          ">
            Dear ${companyDetails ? companyDetails.name : "customer"},
          </p>

          <div style="
            background-color: #f9fafb;
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
          ">
            <h2 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
            ">
              Quote ID
            </h2>
            <p style="
              font-size: 14px;
              color: #6b7280;
              margin: 0 0 16px;
            ">
              ${quoteId}
            </p>

            <h2 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
            ">
              Delivery details
            </h2>
            <p style="
              font-size: 14px;
              color: #6b7280;
              margin: 0 0 16px;
            ">
              ${companyDetails?.name ? `Company: ${companyDetails.name}<br>` : ""}
              ${companyDetails?.phoneNumber ? `Phone: ${companyDetails.phoneNumber}<br>` : ""}
              Date: ${new Date(deliveryDetails.deliveryDate).toLocaleDateString("nl-NL")}<br>
              Time: ${deliveryDetails.deliveryTime}<br>
              Address: ${deliveryDetails.street} ${deliveryDetails.houseNumber}
              ${deliveryDetails.houseNumberAddition || ""}<br>
              ${deliveryDetails.postalCode} ${deliveryDetails.city}
            </p>

            <h2 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
            ">
              Order details
            </h2>
            ${
              orderDetails.selectionType === "custom"
                ? Object.entries(orderDetails.customSelection)
                    .map(([sandwichId, selections]) =>
                      selections
                        .map(
                          (selection) => `
                        <p style="
                          font-size: 14px;
                          color: #6b7280;
                          margin: 0 0 8px;
                        ">
                          <strong>${getSandwichName(sandwichId)}</strong><br>
                          ${selection.quantity}x - ${selection.breadType}
                          ${selection.sauce !== "geen" ? ` with ${selection.sauce}` : ""}
                          - €${selection.subTotal.toFixed(2)}
                        </p>
                      `
                        )
                        .join("")
                    )
                    .join("")
                : `
                  <p style="
                    font-size: 14px;
                    color: #6b7280;
                    margin: 0 0 8px;
                  ">
                    Chicken, Meat, Fish: ${orderDetails.varietySelection.nonVega} sandwiches<br>
                    Vegetarian: ${orderDetails.varietySelection.vega} sandwiches<br>
                    Vegan: ${orderDetails.varietySelection.vegan} sandwiches
                  </p>
                `
            }

            <h2 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin: 16px 0 4px;
            ">
              Allergies or comments
            </h2>
            <p style="
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            ">
              ${orderDetails.allergies || "None specified"}
            </p>

            <h2 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin: 16px 0 4px;
            ">
              Total amount
            </h2>
            <p style="
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            ">
              Subtotal: €${(totalAmount || 0).toFixed(2)}<br>
              VAT (9%): €${((totalAmount || 0) * 0.09).toFixed(2)}<br>
              <strong>Total: €${((totalAmount || 0) * 1.09).toFixed(2)}</strong>
            </p>
          </div>

          <p style="
            font-size: 16px;
            line-height: 24px;
            color: #4b5563;
          ">
            If you have any questions about your order, please contact us.
          </p>

          <p style="
            font-size: 16px;
            line-height: 24px;
            color: #4b5563;
          ">
            With kind regards,<br>
            Team The Sandwich Bar
          </p>
        </div>
      </body>
    </html>
  `;
}

export async function sendOrderConfirmation(order) {
  console.log("========= ORDER CONFIRMATION EMAIL SENDING STARTED =========");
  console.log("Sending order confirmation email to:", order?.email);

  try {
    if (!order || !order.email) {
      console.error("Invalid order or missing email:", order);
      return false;
    }

    // Extract sandwich options if available
    const sandwichOptions = order.sandwichOptions || [];
    console.log(`Sandwich options available: ${sandwichOptions.length}`);

    // Calculate total amount
    const totalAmount = calculateTotal(order.orderDetails);

    // Generate PDF
    try {
      // FIXED: Now passing sandwichOptions to the InvoicePDF component
      const pdfBuffer = await renderToBuffer(
        <InvoicePDF
          quoteId={order.quoteId}
          orderDetails={order.orderDetails}
          deliveryDetails={order.deliveryDetails}
          companyDetails={order.companyDetails}
          amount={order.amount || totalAmount}
          dueDate={
            order.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          }
          sandwichOptions={sandwichOptions} // Pass the sandwich options
        />
      );

      // Use the constants for sender email
      const fromEmail = EMAIL_CONSTANTS.FROM_EMAIL();

      // Generate HTML for the email including sandwich options
      const emailHtml = getOrderConfirmationHtml({
        quoteId: order.quoteId,
        orderDetails: order.orderDetails,
        deliveryDetails: order.deliveryDetails,
        companyDetails: order.companyDetails,
        totalAmount,
        sandwichOptions: sandwichOptions,
      });

      // Log email sending details
      console.log("Sending order confirmation email:");
      console.log("- From:", fromEmail);
      console.log("- To:", order.email);
      console.log("- CC:", EMAIL_CONSTANTS.ADMIN_EMAIL);
      console.log(
        "- Subject:",
        EMAIL_CONSTANTS.EMAIL_SUBJECTS.ORDER_CONFIRMATION(order.quoteId)
      );

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [order.email],
        cc: EMAIL_CONSTANTS.ADMIN_EMAIL,
        subject: EMAIL_CONSTANTS.EMAIL_SUBJECTS.ORDER_CONFIRMATION(
          order.quoteId
        ),
        html: emailHtml,
        attachments: [
          {
            filename: `order-confirmation-${order.quoteId}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (error) {
        console.error("Error sending confirmation email:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return false;
      }

      console.log("Order confirmation email sent successfully:", data);

      // Send SMS notification for the order
      await sendOrderSmsNotification(order);

      console.log(
        "========= ORDER CONFIRMATION EMAIL SENDING COMPLETED ========="
      );
      return true;
    } catch (pdfError) {
      console.error("PDF generation failed for order confirmation:", pdfError);

      // Try sending email without PDF attachment as fallback
      console.log(
        "Attempting to send order confirmation without PDF attachment..."
      );

      const fromEmail = EMAIL_CONSTANTS.FROM_EMAIL();

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [order.email],
        cc: EMAIL_CONSTANTS.ADMIN_EMAIL,
        subject: EMAIL_CONSTANTS.EMAIL_SUBJECTS.ORDER_CONFIRMATION(
          order.quoteId
        ),
        html: getOrderConfirmationHtml({
          quoteId: order.quoteId,
          orderDetails: order.orderDetails,
          deliveryDetails: order.deliveryDetails,
          companyDetails: order.companyDetails,
          totalAmount,
          sandwichOptions: sandwichOptions,
        }),
      });

      if (error) {
        console.error(
          "Fallback order confirmation email sending failed:",
          error
        );
        return false;
      }

      console.log(
        "Fallback order confirmation email sent successfully without PDF"
      );

      // Still try to send SMS notification even if email had issues
      await sendOrderSmsNotification(order);

      return true;
    }
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    console.error("Error stack:", error.stack);
    console.log("========= ORDER CONFIRMATION EMAIL SENDING FAILED =========");
    return false;
  }
}

// Helper function to calculate total
function calculateTotal(orderDetails) {
  if (orderDetails.selectionType === "custom") {
    const subtotal = Object.values(orderDetails.customSelection)
      .flat()
      .reduce((total, selection) => total + selection.subTotal, 0);
    return subtotal; // excluding VAT
  } else {
    return orderDetails.totalSandwiches * 6.38; // Assuming €6.38 per sandwich, excluding VAT
  }
}

const generateInvoiceEmailHtml = (invoiceData) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice</title>
        <style>
          body {
            font-family: Helvetica, Arial, sans-serif;
            background-color: #FFFCF8;
            color: #382628;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px 0 48px;
          }
          .header {
            text-align: center;
            padding: 20px 0;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            color: #382628;
            margin-bottom: 20px;
          }
          .section {
            background-color: #FFFCF8;
            border: 1px solid #4D343F;
            border-radius: 4px;
            padding: 24px;
            margin: 24px 0;
          }
          .subtitle {
            font-size: 16px;
            font-weight: 600;
            color: #4D343F;
            margin-bottom: 8px;
          }
          .text {
            font-size: 14px;
            color: #382628;
            margin: 0 0 16px;
          }
          .total {
            font-size: 18px;
            font-weight: 600;
            color: #382628;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">Invoice</h1>
          </div>
          
          <div class="section">
            <h2 class="subtitle">Invoice Details</h2>
            <p class="text">Invoice Number: ${invoiceData.invoiceNumber}</p>
            <p class="text">Date: ${new Date(invoiceData.date).toLocaleDateString("nl-NL")}</p>
            <p class="text">Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString("nl-NL")}</p>
          </div>

          <div class="section">
            <h2 class="subtitle">Order Details</h2>
            <p class="text">Quote ID: ${invoiceData.quoteId}</p>
            <p class="text">Delivery Date: ${new Date(invoiceData.deliveryDate).toLocaleDateString("nl-NL")}</p>
            <p class="text">Delivery Time: ${invoiceData.deliveryTime}</p>
          </div>

          <div class="section">
            <h2 class="subtitle">Items</h2>
            ${invoiceData.items
              .map(
                (item) => `
              <p class="text">
                ${item.quantity}x ${item.description} - €${item.price.toFixed(2)}
              </p>
            `
              )
              .join("")}
            <p class="total">
              Subtotal: €${invoiceData.subtotal.toFixed(2)}<br>
              VAT (9%): €${(invoiceData.subtotal * 0.09).toFixed(2)}<br>
              Total: €${(invoiceData.subtotal * 1.09).toFixed(2)}
            </p>
          </div>

          <div class="section">
            <h2 class="subtitle">Payment Information</h2>
            <p class="text">
              Please transfer the total amount to:<br>
              Bank: ${invoiceData.bankDetails.bankName}<br>
              IBAN: ${invoiceData.bankDetails.iban}<br>
              BIC: ${invoiceData.bankDetails.bic}<br>
              Account Holder: ${invoiceData.bankDetails.accountHolder}
            </p>
          </div>

          <p class="text">
            If you have any questions about this invoice, please contact us.
          </p>

          <p class="text">
            With kind regards,<br>
            Team The Sandwich Bar
          </p>
        </div>
      </body>
    </html>
  `;
};

export async function sendInvoiceEmail(order) {
  console.log("========= INVOICE EMAIL SENDING STARTED =========");
  console.log(
    "Order data received:",
    order ? "Valid order object" : "NULL or undefined order"
  );

  try {
    if (!order || !order.email) {
      console.error("Invalid order or missing email:", order);
      return false;
    }

    // Extract sandwich options if available
    const sandwichOptions = order.sandwichOptions || [];
    console.log(`Sandwich options available: ${sandwichOptions.length}`);

    console.log("Email recipient:", order.email);
    console.log("Admin copy to:", EMAIL_CONSTANTS.ADMIN_EMAIL);
    console.log(
      "Using Resend API key:",
      process.env.RESEND_API_KEY ? "Key is set" : "Key is missing"
    );

    // Use the constants for sender email
    const fromEmail = EMAIL_CONSTANTS.FROM_EMAIL();
    console.log("From email address:", fromEmail);

    // Process amount to ensure it has the correct format
    let formattedAmount;
    if (typeof order.amount === "number") {
      formattedAmount = {
        total: order.amount || 0,
        subtotal: (order.amount || 0) / 1.09,
        vat: (order.amount || 0) - (order.amount || 0) / 1.09,
      };
    } else if (typeof order.amount === "object" && order.amount !== null) {
      formattedAmount = {
        total: order.amount.total || 0,
        subtotal: order.amount.subtotal || 0,
        vat: order.amount.vat || 0,
      };
    } else {
      // Default fallback if amount is completely invalid
      formattedAmount = { total: 0, subtotal: 0, vat: 0 };
      console.warn("Invalid amount format, using defaults:", formattedAmount);
    }

    // Format due date properly
    const dueDateObj = order.dueDate
      ? new Date(order.dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Ensure all required data has defaults to prevent null references
    const safeOrderData = {
      quoteId: order.quoteId || "UNKNOWN",
      orderDetails: order.orderDetails || {
        selectionType: "unknown",
        allergies: "",
        customSelection: {},
        varietySelection: { vega: 0, nonVega: 0, vegan: 0 },
      },
      deliveryDetails: order.deliveryDetails || {
        deliveryDate: new Date().toISOString(),
        deliveryTime: "12:00",
        street: "",
        houseNumber: "",
        houseNumberAddition: "",
        postalCode: "",
        city: "",
      },
      companyDetails: order.companyDetails || {
        name: "Unknown Company",
        vatNumber: "",
        address: {
          street: "",
          houseNumber: "",
          houseNumberAddition: "",
          postalCode: "",
          city: "",
        },
      },
      amount: formattedAmount,
      dueDate: dueDateObj,
      sandwichOptions: sandwichOptions,
    };

    // Generate PDF with safe data
    console.log("Generating PDF...");
    try {
      // FIXED: Now passing sandwichOptions to the InvoicePDF component
      const pdfBuffer = await renderToBuffer(
        <InvoicePDF
          quoteId={safeOrderData.quoteId}
          orderDetails={safeOrderData.orderDetails}
          deliveryDetails={safeOrderData.deliveryDetails}
          companyDetails={safeOrderData.companyDetails}
          amount={safeOrderData.amount}
          dueDate={safeOrderData.dueDate}
          sandwichOptions={safeOrderData.sandwichOptions} // Pass the sandwich options
        />
      );
      console.log("PDF generated successfully");

      // Calculate a safe total amount for the email HTML
      const totalAmount =
        typeof order.amount === "number"
          ? order.amount
          : order.amount?.total || 0;

      // Generate email HTML with sandwich options
      const emailHtml = generateInvoiceEmailHtml({
        invoiceNumber: safeOrderData.quoteId,
        date: new Date().toISOString(),
        dueDate: safeOrderData.dueDate,
        subtotal: safeOrderData.amount.subtotal,
        total: safeOrderData.amount.total,
        vat: safeOrderData.amount.vat,
        bankDetails: {
          bankName: "ING Bank",
          iban: "NL05 INGB 0006 8499 73",
          bic: "INGBNL2A",
          accountHolder: "The Sandwich Bar Nassaukade B.V.",
        },
        quoteId: safeOrderData.quoteId,
        deliveryDate: safeOrderData.deliveryDetails.deliveryDate,
        deliveryTime: safeOrderData.deliveryDetails.deliveryTime,
        items: [
          {
            quantity: 1,
            description: "Order Confirmation",
            price: {
              total: totalAmount,
              subtotal: safeOrderData.amount.subtotal,
              vat: safeOrderData.amount.vat,
            },
          },
        ],
      });

      // Log email data before sending
      console.log("Attempting to send email with the following data:");
      console.log("- From:", fromEmail);
      console.log("- To:", order.email);
      console.log("- CC:", EMAIL_CONSTANTS.ADMIN_EMAIL);
      console.log(
        "- Subject:",
        EMAIL_CONSTANTS.EMAIL_SUBJECTS.INVOICE(safeOrderData.quoteId)
      );

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [order.email],
        cc: EMAIL_CONSTANTS.ADMIN_EMAIL,
        subject: EMAIL_CONSTANTS.EMAIL_SUBJECTS.INVOICE(safeOrderData.quoteId),
        html: emailHtml,
        attachments: [
          {
            filename: `invoice-${safeOrderData.quoteId}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (error) {
        console.error("Error sending invoice email:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return false;
      }

      console.log("Email sent successfully:", data);

      // Send SMS notification for the invoice
      await sendSmsNotification(order, "invoice");

      console.log("========= INVOICE EMAIL SENDING COMPLETED =========");
      return true;
    } catch (pdfError) {
      console.error("PDF generation failed:", pdfError);
      console.error("Error stack:", pdfError.stack);

      // Try sending email without PDF attachment as fallback
      console.log(
        "Attempting to send email without PDF attachment as fallback..."
      );

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [order.email],
        cc: EMAIL_CONSTANTS.ADMIN_EMAIL,
        subject: EMAIL_CONSTANTS.EMAIL_SUBJECTS.INVOICE(safeOrderData.quoteId),
        html: generateInvoiceEmailHtml({
          invoiceNumber: safeOrderData.quoteId,
          date: new Date().toISOString(),
          dueDate: safeOrderData.dueDate,
          subtotal: safeOrderData.amount.subtotal,
          total: safeOrderData.amount.total,
          vat: safeOrderData.amount.vat,
          bankDetails: {
            bankName: "ING Bank",
            iban: "NL05 INGB 0006 8499 73",
            bic: "INGBNL2A",
            accountHolder: "The Sandwich Bar Nassaukade B.V.",
          },
          quoteId: safeOrderData.quoteId,
          deliveryDate: safeOrderData.deliveryDetails.deliveryDate,
          deliveryTime: safeOrderData.deliveryDetails.deliveryTime,
          items: [
            {
              quantity: 1,
              description: "Order Confirmation",
              price: {
                total: safeOrderData.amount.total,
                subtotal: safeOrderData.amount.subtotal,
                vat: safeOrderData.amount.vat,
              },
            },
          ],
        }),
      });

      if (error) {
        console.error("Fallback email sending failed:", error);
        return false;
      }

      console.log("Fallback email sent successfully without PDF");
      return true;
    }
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    console.error("Error stack:", error.stack);
    console.log("========= INVOICE EMAIL SENDING FAILED =========");
    return false;
  }
}
