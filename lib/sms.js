// lib/sms.js
import twilio from "twilio";
import { isDrink } from "./product-helpers";

// Initialize Twilio client with environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Create an array of notification recipients
const NOTIFICATION_RECIPIENTS = [
  // Add phone numbers that should receive notifications
  process.env.NOTIFICATION_PHONE_1,
  process.env.NOTIFICATION_PHONE_2,
  // Add more as needed
].filter(Boolean);

/**
 * Send an SMS notification for a new order
 * @param {Object} orderData - The order data
 * @returns {Promise<boolean>} - Whether the SMS was sent successfully
 */
export async function sendOrderSmsNotification(orderData) {
  // Early return if no recipients are configured
  if (!NOTIFICATION_RECIPIENTS.length) {
    console.warn("No SMS notification recipients configured");
    return false;
  }

  try {
    // Check if Twilio credentials are configured
    if (!accountSid || !authToken || !twilioNumber) {
      console.error("Missing Twilio credentials. SMS notification not sent.");
      return false;
    }

    console.log("===== SENDING SMS NOTIFICATIONS =====");

    // Initialize the Twilio client
    const client = twilio(accountSid, authToken);

    // Create a message appropriate for SMS (short and concise)
    const messageBody = createOrderSmsContent(orderData);

    // Track successful sends
    let successCount = 0;

    // Send SMS to each recipient
    for (const recipient of NOTIFICATION_RECIPIENTS) {
      try {
        console.log(`Sending SMS to ${recipient}`);

        const message = await client.messages.create({
          body: messageBody,
          from: twilioNumber,
          to: recipient,
        });

        console.log(
          `SMS sent successfully to ${recipient}, SID: ${message.sid}`
        );
        successCount++;
      } catch (recipientError) {
        console.error(`Failed to send SMS to ${recipient}:`, recipientError);
      }
    }

    console.log(
      `===== SMS NOTIFICATIONS COMPLETED: ${successCount}/${NOTIFICATION_RECIPIENTS.length} =====`
    );
    return successCount > 0;
  } catch (error) {
    console.error("Failed to send SMS notifications:", error);
    return false;
  }
}

/**
 * Create SMS content for order notification in Dutch
 * @param {Object} orderData - The order data
 * @returns {string} - The SMS content
 */
function createOrderSmsContent(orderData) {
  const {
    quoteId,
    orderDetails,
    deliveryDetails,
    companyDetails,
    fullName,
    sandwichOptions = [],
  } = orderData;

  // Format delivery date
  const deliveryDate = new Date(
    deliveryDetails.deliveryDate
  ).toLocaleDateString("nl-NL");

  // Calculate total sandwiches based on selection type
  let totalSandwiches = 0;
  if (orderDetails.selectionType === "custom") {
    // For custom selections, calculate total from actual selections (excluding drinks)
    totalSandwiches = Object.entries(orderDetails.customSelection || {}).reduce(
      (sum, [sandwichId, selections]) => {
        // Find the product to check if it's a drink
        const product = sandwichOptions.find((s) => s._id === sandwichId);
        if (!product || isDrink(product)) return sum;

        // Sum up quantities for non-drink items
        return (
          sum +
          selections.reduce(
            (total, selection) => total + (selection.quantity || 0),
            0
          )
        );
      },
      0
    );
  } else {
    // For variety selections, use the stored totalSandwiches
    totalSandwiches = orderDetails.totalSandwiches || 0;
  }

  // Get address information
  const street = deliveryDetails.street || "";
  const houseNumber = deliveryDetails.houseNumber || "";
  const houseNumberAddition = deliveryDetails.houseNumberAddition || "";
  const postalCode = deliveryDetails.postalCode || "";

  // Format full address
  const fullAddress = `${street} ${houseNumber}${houseNumberAddition}, ${postalCode}`;

  // Get company name if available, otherwise use full name
  const companyName = companyDetails?.companyName || companyDetails?.name || "";
  const customerInfo = companyName.trim() ? `Bedrijf: ${companyName}` : fullName ? `Klant: ${fullName}` : "";

  // Format the message in Dutch with all requested information
  return `Nieuwe Catering Bestelling!

${totalSandwiches} broodjes
Datum: ${deliveryDate} om ${deliveryDetails.deliveryTime}
Adres: ${fullAddress}
${customerInfo}
Contact: ${deliveryDetails.phoneNumber || "Niet opgegeven"}

Ref: ${quoteId}`;
}

/**
 * Combine order and invoice notifications into a single function
 * @param {Object} data - The order or invoice data
 * @param {string} type - The type of notification ('order' or 'invoice')
 * @returns {Promise<boolean>} - Whether the SMS was sent successfully
 */
export async function sendSmsNotification(data, type = "order") {
  // Determine if this is an order or invoice notification
  if (type === "invoice") {
    return sendOrderSmsNotification(data, true);
  } else {
    return sendOrderSmsNotification(data);
  }
}
