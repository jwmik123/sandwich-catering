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
        <link href="https://fonts.googleapis.com/css2?family=Helvetica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #FFFCF8;
            font-family: 'Helvetica', Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #382628;
            line-height: 1.6;
          }
          .container {
            background-color: #FFFCF8;
            margin: 0 auto;
            max-width: 600px;
            padding: 30px;
          }
          .header {
            margin-bottom: 20px;
            border-bottom: 1px solid #4D343F;
            padding-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-left {
            flex: 1;
          }
          .logo {
            width: 80px;
            height: 80px;
          }
          .title {
            font-size: 18px;
            margin-bottom: 10px;
            font-weight: bold;
            color: #382628;
          }
          .order-id {
            font-size: 12px;
            color: #4D343F;
            margin-bottom: 5px;
          }
          .section {
            margin-top: 15px;
            margin-bottom: 15px;
          }
          .section-title {
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: bold;
            color: #382628;
          }
          .details-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .details-column {
            width: 48%;
          }
          .row {
            margin-bottom: 5px;
            display: flex;
          }
          .label {
            width: 30%;
            font-size: 12px;
            color: #4D343F;
          }
          .value {
            width: 70%;
            font-size: 10px;
            color: #382628;
          }
          .table {
            width: 100%;
            margin-top: 10px;
            margin-bottom: 10px;
          }
          .table-header {
            display: flex;
            background-color: #4D343F;
            padding: 5px;
            border-bottom: 1px solid #382628;
          }
          .table-row {
            display: flex;
            padding: 5px;
            border-bottom: 1px solid #4D343F;
          }
          .table-cell {
            flex: 1;
            font-size: 12px;
            color: #382628;
          }
          .table-cell-bold {
            flex: 1;
            font-size: 12px;
            font-weight: bold;
            color: #FFFCF8;
          }
          .table-cell-name {
            flex: 2;
            font-size: 12px;
            color: #382628;
          }
          .table-cell-bold-name {
            flex: 2;
            font-size: 12px;
            font-weight: bold;
            color: #FFFCF8;
          }
          .total-section {
            margin-top: 20px;
            padding-top: 10px;
          }
          .total-row {
            display: flex;
            margin-bottom: 5px;
          }
          .total-label {
            width: 30%;
            font-size: 12px;
            font-weight: bold;
            color: #382628;
          }
          .total-value {
            width: 70%;
            font-size: 12px;
            color: #382628;
          }
          .company-details {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #4D343F;
            font-size: 10px;
            color: #4D343F;
          }
          @media screen and (max-width: 600px) {
            .details-container {
              flex-direction: column;
            }
            .details-column {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <h1 class="title">Order Confirmation</h1>
              <p class="order-id">Quote ID: ${quoteId}</p>
              <p class="order-id">Date: ${new Date().toLocaleDateString("nl-NL")}</p>
            </div>
            <div class="header-right">
              <img src="https://catering.thesandwichbar.nl/tsb-logo-full.png" alt="The Sandwich Bar Logo" class="logo" />
            </div>
          </div>

          <!-- Delivery and Payment Details -->
          <div class="details-container">
            <!-- Delivery Details -->
            <div class="details-column">
              <div class="section">
                <h2 class="section-title">Delivery</h2>
                <div class="row">
                  <div class="label">Company:</div>
                  <div class="value">${companyDetails?.name || "N/A"}</div>
                </div>
                <div class="row">
                  <div class="label">Phone:</div>
                  <div class="value">${deliveryDetails?.phoneNumber || "N/A"}</div>
                </div>
                <div class="row">
                  <div class="label">Delivery Date:</div>
                  <div class="value">${formattedDeliveryDate}</div>
                </div>
                <div class="row">
                  <div class="label">Time:</div>
                  <div class="value">${deliveryDetails?.deliveryTime || "N/A"}</div>
                </div>
                <div class="row">
                  <div class="label">Address:</div>
                  <div class="value">
                    ${deliveryDetails?.street || ""} ${deliveryDetails?.houseNumber || ""}
                    ${deliveryDetails?.houseNumberAddition || ""}<br>
                    ${deliveryDetails?.postalCode || ""} ${deliveryDetails?.city || ""}
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Information -->
            <div class="details-column">
              <div class="section">
                <h2 class="section-title">Payment Information</h2>
                <div class="row">
                  <div class="label">IBAN:</div>
                  <div class="value">NL05 INGB 0006 8499 73</div>
                </div>
                <div class="row">
                  <div class="label">BIC:</div>
                  <div class="value">INGBNL2A</div>
                </div>
                <div class="row">
                  <div class="value">The Sandwich Bar Nassaukade B.V.</div>
                </div>
                <div class="row">
                  <div class="label">KvK Number:</div>
                  <div class="value">81038739</div>
                </div>
                <div class="row">
                  <div class="label">VAT Number:</div>
                  <div class="value">NL861900558B01</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Details -->
          <div class="section">
            <h2 class="section-title">Order</h2>
            <div class="table">
              <div class="table-header">
                <div class="table-cell-bold-name">Sandwich</div>
                <div class="table-cell-bold">Quantity</div>
                <div class="table-cell-bold">Bread</div>
                <div class="table-cell-bold">Sauce</div>
                <div class="table-cell-bold">Price</div>
              </div>
              ${
                orderDetails.selectionType === "custom"
                  ? Object.entries(orderDetails.customSelection || {})
                      .map(([sandwichId, selections]) => {
                        if (!Array.isArray(selections)) return "";
                        return selections
                          .map(
                            (selection) => `
                              <div class="table-row">
                                <div class="table-cell-name">${getSandwichName(sandwichId)}</div>
                                <div class="table-cell">${selection.quantity || 0}x</div>
                                <div class="table-cell">${selection.breadType || "N/A"}</div>
                                <div class="table-cell">${selection.sauce !== "geen" ? selection.sauce : "-"}</div>
                                <div class="table-cell">€${(selection.subTotal || 0).toFixed(2)}</div>
                              </div>
                            `
                          )
                          .join("");
                      })
                      .join("")
                  : `
                    <div class="table-row">
                      <div class="table-cell-name">Chicken, Meat, Fish</div>
                      <div class="table-cell">${orderDetails.varietySelection?.nonVega || 0}x</div>
                      <div class="table-cell">-</div>
                      <div class="table-cell">-</div>
                      <div class="table-cell">€${((orderDetails.varietySelection?.nonVega || 0) * 6.38).toFixed(2)}</div>
                    </div>
                    <div class="table-row">
                      <div class="table-cell-name">Vegetarian</div>
                      <div class="table-cell">${orderDetails.varietySelection?.vega || 0}x</div>
                      <div class="table-cell">-</div>
                      <div class="table-cell">-</div>
                      <div class="table-cell">€${((orderDetails.varietySelection?.vega || 0) * 6.38).toFixed(2)}</div>
                    </div>
                    <div class="table-row">
                      <div class="table-cell-name">Vegan</div>
                      <div class="table-cell">${orderDetails.varietySelection?.vegan || 0}x</div>
                      <div class="table-cell">-</div>
                      <div class="table-cell">-</div>
                      <div class="table-cell">€${((orderDetails.varietySelection?.vegan || 0) * 6.38).toFixed(2)}</div>
                    </div>
                  `
              }
            </div>
          </div>

          <!-- Allergies -->
          <div class="section">
            <h2 class="section-title">Allergies or comments</h2>
            <div class="value">${orderDetails.allergies || "None specified"}</div>
          </div>

          <!-- Totals -->
          <div class="total-section">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-value">€${(totalAmount || 0).toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">VAT (9%):</div>
              <div class="total-value">€${((totalAmount || 0) * 0.09).toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Total:</div>
              <div class="total-value" style="font-weight: bold;">€${((totalAmount || 0) * 1.09).toFixed(2)}</div>
            </div>
          </div>

          <div class="company-details">
            <p>The Sandwich Bar B.V.</p>
            <p>Nassaukade 378 H</p>
            <p>1054 AD Amsterdam</p>
            <p>info@thesandwichbar.nl</p>
          </div>
          
          <p style="
            font-size: 12px;
            line-height: 18px;
            color: #4D343F;
            margin-top: 20px;
          ">
            If you have any questions about your order, please contact us.
          </p>

          <p style="
            font-size: 12px;
            line-height: 18px;
            color: #4D343F;
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
  // Ensure all numeric values are properly converted to numbers
  const safeSubtotal = Number(invoiceData.subtotal) || 0;
  const safeVat = Number(invoiceData.vat) || 0;
  const safeTotal = Number(invoiceData.total) || 0;

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
                ${item.quantity}x ${item.description} - €${Number(item.price || 0).toFixed(2)}
              </p>
            `
              )
              .join("")}
            <p class="total">
              Subtotal: €${safeSubtotal.toFixed(2)}<br>
              VAT (9%): €${safeVat.toFixed(2)}<br>
              Total: €${safeTotal.toFixed(2)}
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
            price: totalAmount,
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
              price: safeOrderData.amount.total,
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
