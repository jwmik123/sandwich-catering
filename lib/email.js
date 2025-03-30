// lib/email.js - Add these imports at the top
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "@/app/components/InvoicePDF";
import { sendOrderSmsNotification, sendInvoiceSmsNotification } from "./sms";

// ... rest of existing imports and code ...

// Update the sendOrderConfirmation function to also send SMS
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

// Update the sendInvoiceEmail function to also send SMS
export async function sendInvoiceEmail(order) {
  console.log("========= INVOICE EMAIL SENDING STARTED =========");
  console.log(
    "Order data received:",
    order ? "Valid order object" : "NULL or undefined order"
  );

  try {
    // ... existing code ...

    console.log("Email sent successfully:", data);

    // Send SMS notification for the invoice
    await sendInvoiceSmsNotification(order);

    console.log("========= INVOICE EMAIL SENDING COMPLETED =========");
    return true;
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    console.error("Error stack:", error.stack);
    console.log("========= INVOICE EMAIL SENDING FAILED =========");
    return false;
  }
}
