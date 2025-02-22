// lib/email.js
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "@/app/components/InvoicePDF";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatCurrency(value) {
  const number = Number(value);
  return isNaN(number) ? "0.00" : number.toFixed(2);
}

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
              Referentienummer
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
              Bezorggegevens
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
              Bestelling
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
                  Kip, Vlees, Vis: ${orderDetails.varietySelection.nonVega} broodjes<br>
                  Vegetarisch: ${orderDetails.varietySelection.vega} broodjes<br>
                  Vegan: ${orderDetails.varietySelection.vegan} broodjes
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

            <h2 style="
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin: 16px 0 4px;
            ">
              Totaalbedrag
            </h2>
            <p style="
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            ">
              Subtotaal: €${totalAmount.toFixed(2)}<br>
              BTW (9%): €${(totalAmount * 1.09 - totalAmount).toFixed(2)}<br>
              <strong>Totaal: €${(totalAmount * 1.09).toFixed(2)}</strong>
            </p>
          </div>

          <p style="
            font-size: 16px;
            line-height: 24px;
            color: #4b5563;
          ">
            Als u vragen heeft over uw bestelling, neem dan contact met ons op.
          </p>

          <p style="
            font-size: 16px;
            line-height: 24px;
            color: #4b5563;
          ">
            Met vriendelijke groet,<br>
            Team The Sandwich Bar
          </p>
        </div>
      </body>
    </html>
  `;
}

export async function sendOrderConfirmation(order) {
  console.log("Sending order confirmation email to:", order);
  try {
    // Calculate total amount
    const totalAmount = calculateTotal(order.orderDetails);

    const { data, error } = await resend.emails.send({
      //   from: `LunchCatering <orders@${process.env.NEXT_PUBLIC_BASE_URL.replace("https://", "")}>`,
      from: "onboarding@resend.dev",
      to: order.email,
      subject: `Bestelling Bevestigd - ${order.quoteId}`,
      html: getOrderConfirmationHtml({
        quoteId: order.quoteId,
        orderDetails: order.orderDetails,
        deliveryDetails: order.deliveryDetails,
        companyDetails: order.companyDetails,
        totalAmount,
      }),
    });

    if (error) {
      console.error("Error sending confirmation email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
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
          <title>Factuur voor uw bestelling</title>
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
              Factuur voor uw bestelling
            </h1>
  
            <p style="
              font-size: 16px;
              line-height: 24px;
              color: #4b5563;
            ">
              Beste ${companyDetails.name},
            </p>
  
            <p style="
              font-size: 16px;
              line-height: 24px;
              color: #4b5563;
            ">
              Bedankt voor uw bestelling. Hierbij ontvangt u de factuur voor uw lunch catering.
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
                  <strong>Factuurnummer:</strong> ${quoteId}<br>
                  <strong>Factuurdatum:</strong> ${new Date().toLocaleDateString("nl-NL")}<br>
                  <strong>Vervaldatum:</strong> ${new Date(dueDate).toLocaleDateString("nl-NL")}<br>
                  <strong>BTW nummer:</strong> ${companyDetails.vatNumber}
                </p>
              </div>
  
              <h2 style="
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 4px;
              ">
                Bezorggegevens
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
                Bestelling
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
                    Kip, Vlees, Vis: ${orderDetails.varietySelection.nonVega} broodjes<br>
                    Vegetarisch: ${orderDetails.varietySelection.vega} broodjes<br>
                    Vegan: ${orderDetails.varietySelection.vegan} broodjes
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
              <h2 style="
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                margin: 16px 0 4px;
              ">
                Totaalbedrag
              </h2>
              <p style="
                font-size: 14px;
                color: #6b7280;
                margin: 0;
              ">
               Subtotaal: €${formatCurrency(subtotal)}<br>
              BTW (9%): €${formatCurrency(vat)}<br>
              <strong>Totaal: €${formatCurrency(total)}</strong>
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
                Betalingsinformatie
              </h2>
              <p style="
                font-size: 14px;
                color: #6b7280;
                margin: 0;
              ">
                Graag het totaalbedrag binnen 14 dagen overmaken naar:<br>
                IBAN: NL05 INGB 0006 8499 73<br>
                T.n.v.: The Sandwich Bar Nassaukade B.V.<br>
                O.v.v.: Factuurnummer ${quoteId}
              </p>
            </div>
  
            <p style="
              font-size: 16px;
              line-height: 24px;
              color: #4b5563;
            ">
              Als u vragen heeft over deze factuur, neem dan contact met ons op.
            </p>
  
            <p style="
              font-size: 16px;
              line-height: 24px;
              color: #4b5563;
            ">
              Met vriendelijke groet,<br>
              Team The Sandwich Bar
            </p>
          </div>
        </body>
      </html>
    `;
}

export async function sendInvoiceEmail(order) {
  try {
    if (!order.email) {
      console.error("No email address found in order:", order);
      return false;
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <InvoicePDF
        quoteId={order.quoteId}
        orderDetails={order.orderDetails}
        deliveryDetails={order.deliveryDetails}
        companyDetails={order.companyDetails}
        amount={order.amount}
        dueDate={order.dueDate}
      />
    );

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [order.email],
      subject: `Factuur - ${order.quoteId}`,
      html: getInvoiceEmailHtml({
        quoteId: order.quoteId,
        orderDetails: order.orderDetails,
        deliveryDetails: order.deliveryDetails,
        companyDetails: order.companyDetails,
        amount: order.amount.total,
        dueDate: order.dueDate,
      }),
      attachments: [
        {
          filename: `factuur-${order.quoteId}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log("Email sent successfully:", data);

    if (error) {
      console.error("Error sending invoice email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    return false;
  }
}
