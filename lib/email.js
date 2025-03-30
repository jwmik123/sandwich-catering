// lib/email.js
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "@/app/components/InvoicePDF";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_CONSTANTS = {
  // IMPORTANT: This must match the domain you've verified in Resend
  VERIFIED_DOMAIN: "catering.thesandwichbar.nl",
  SENDER_NAME: "LunchCatering",
  FROM_EMAIL: function () {
    return `${this.SENDER_NAME} <orders@${this.VERIFIED_DOMAIN}>`;
  },
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
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bestelling Bevestigd</title>
      </head>
      <body style="
        background-color: #f6f9fc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
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
            Bestelling Bevestigd
          </h1>

          <p style="
            font-size: 16px;
            line-height: 24px;
            color: #4b5563;
          ">
            Beste ${companyDetails ? companyDetails.companyName : "klant"},
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
              Datum: ${new Date(deliveryDetails.deliveryDate).toLocaleDateString("nl-NL")}<br>
              Tijd: ${deliveryDetails.deliveryTime}<br>
              Adres: ${deliveryDetails.street} ${deliveryDetails.houseNumber}
              ${deliveryDetails.houseNumberAddition || ""}<br>
              ${deliveryDetails.postalCode} ${deliveryDetails.city}
            </p>

            <h2 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
            ">
              Order
            </h2>
            ${
              orderDetails.selectionType === "custom"
                ? Object.entries(orderDetails.customSelection)
                    .map(([_, selections]) =>
                      selections
                        .map(
                          (selection) => `
                      <p style="
                        font-size: 14px;
                        color: #6b7280;
                        margin: 0 0 8px;
                      ">
                        ${selection.quantity}x - ${selection.breadType}
                        ${selection.sauce !== "none" ? ` with ${selection.sauce}` : ""}
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
                ${orderDetails.allergies}
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
              Subtotal: €${totalAmount.toFixed(2)}<br>
              VAT (9%): €${(totalAmount * 1.09 - totalAmount).toFixed(2)}<br>
              <strong>Total: €${(totalAmount * 1.09).toFixed(2)}</strong>
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

    // Calculate total amount
    const totalAmount = calculateTotal(order.orderDetails);

    // Generate PDF
    try {
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
        />
      );

      // Use the constants for sender email
      const fromEmail = EMAIL_CONSTANTS.FROM_EMAIL();

      // Generate HTML for the email
      const emailHtml = getOrderConfirmationHtml({
        quoteId: order.quoteId,
        orderDetails: order.orderDetails,
        deliveryDetails: order.deliveryDetails,
        companyDetails: order.companyDetails,
        totalAmount,
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
        cc: [EMAIL_CONSTANTS.ADMIN_EMAIL], // Send a copy to the admin
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
      const emailHtml = getOrderConfirmationHtml({
        quoteId: order.quoteId,
        orderDetails: order.orderDetails,
        deliveryDetails: order.deliveryDetails,
        companyDetails: order.companyDetails,
        totalAmount,
      });

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [order.email],
        cc: [EMAIL_CONSTANTS.ADMIN_EMAIL], // Send a copy to the admin
        subject: EMAIL_CONSTANTS.EMAIL_SUBJECTS.ORDER_CONFIRMATION(
          order.quoteId
        ),
        html: emailHtml,
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
    return subtotal * 1.09; // Including 9% VAT
  } else {
    return orderDetails.totalSandwiches * 5 * 1.09; // Assuming €5 per sandwich + 9% VAT
  }
}

function getInvoiceEmailHtml({
  quoteId,
  orderDetails,
  deliveryDetails,
  companyDetails,
  totalAmount,
  dueDate,
}) {
  const total = Number(totalAmount);
  const subtotal = total / 1.09;
  const vat = total - subtotal;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice for your order</title>
        </head>
        <body style="
          background-color: #f6f9fc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
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
              Invoice for your order
            </h1>
  
            <p style="
              font-size: 16px;
              line-height: 24px;
              color: #4b5563;
            ">
                Dear ${companyDetails.name},
            </p>
  
            <p style="
              font-size: 16px;
              line-height: 24px;
              color: #4b5563;
            ">
              Thank you for your order. Here is the invoice for your lunch catering.
            </p>
  
            <div style="
              background-color: #f9fafb;
              border-radius: 4px;
              padding: 20px;
              margin: 20px 0;
            ">
              <div style="margin-bottom: 20px;">
                <p style="
                  font-size: 14px;
                  color: #6b7280;
                  margin: 0;
                ">
                  <strong>Invoice number:</strong> ${quoteId}<br>
                  <strong>Invoice date:</strong> ${new Date().toLocaleDateString("nl-NL")}<br>
                  <strong>Due date:</strong> ${new Date(dueDate).toLocaleDateString("nl-NL")}<br>
                  <strong>VAT number:</strong> ${companyDetails.vatNumber}
                </p>
              </div>
  
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
                      .map(([_, selections]) =>
                        selections
                          .map(
                            (selection) => `
                        <p style="
                          font-size: 14px;
                          color: #6b7280;
                          margin: 0 0 8px;
                        ">
                          ${selection.quantity}x - ${selection.breadType}
                          ${selection.sauce !== "geen" ? ` met ${selection.sauce}` : ""}
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
                Allergieën of opmerkingen
              </h2>
              <p style="
                font-size: 14px;
                color: #6b7280;
                margin: 0;
              ">
                ${orderDetails.allergies}
              </p>
              
            </div>
  
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
                margin-bottom: 8px;
              ">
                Payment Information
              </h2>
              <p style="
                font-size: 14px;
                color: #6b7280;
                margin: 0;
              ">
                Please transfer the total amount within 14 days to:<br>
                IBAN: NL05 INGB 0006 8499 73<br>
                Attn: The Sandwich Bar Nassaukade B.V.<br>
                Reference: Invoice Number ${quoteId}
              </p>
            </div>
  
            <p style="
              font-size: 16px;
              line-height: 24px;
              color: #4b5563;
            ">
              If you have any questions about this invoice, please contact us.
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
    };

    // Generate PDF with safe data
    console.log("Generating PDF...");
    try {
      const pdfBuffer = await renderToBuffer(
        <InvoicePDF
          quoteId={safeOrderData.quoteId}
          orderDetails={safeOrderData.orderDetails}
          deliveryDetails={safeOrderData.deliveryDetails}
          companyDetails={safeOrderData.companyDetails}
          amount={safeOrderData.amount}
          dueDate={safeOrderData.dueDate}
        />
      );
      console.log("PDF generated successfully");

      // Calculate a safe total amount for the email HTML
      const totalAmount =
        typeof order.amount === "number"
          ? order.amount
          : order.amount?.total || 0;

      // Generate email HTML
      const emailHtml = getInvoiceEmailHtml({
        quoteId: safeOrderData.quoteId,
        orderDetails: safeOrderData.orderDetails,
        deliveryDetails: safeOrderData.deliveryDetails,
        companyDetails: safeOrderData.companyDetails,
        totalAmount,
        dueDate: safeOrderData.dueDate,
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

      // Send to customer with CC to admin
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [order.email],
        cc: [EMAIL_CONSTANTS.ADMIN_EMAIL], // Send a copy to the admin
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
      console.log("========= INVOICE EMAIL SENDING COMPLETED =========");
      return true;
    } catch (pdfError) {
      console.error("PDF generation failed:", pdfError);
      console.error("Error stack:", pdfError.stack);

      // Try sending email without PDF attachment as fallback
      console.log(
        "Attempting to send email without PDF attachment as fallback..."
      );
      const emailHtml = getInvoiceEmailHtml({
        quoteId: safeOrderData.quoteId,
        orderDetails: safeOrderData.orderDetails,
        deliveryDetails: safeOrderData.deliveryDetails,
        companyDetails: safeOrderData.companyDetails,
        totalAmount: safeOrderData.amount.total,
        dueDate: safeOrderData.dueDate,
      });

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [order.email],
        cc: [EMAIL_CONSTANTS.ADMIN_EMAIL], // Send a copy to the admin
        subject: EMAIL_CONSTANTS.EMAIL_SUBJECTS.INVOICE(safeOrderData.quoteId),
        html: emailHtml,
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
