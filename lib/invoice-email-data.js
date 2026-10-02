// Shape a Sanity invoice (or a snapshot of one) into the order object that
// sendOrderConfirmation and InvoicePDF expect. Shared by the send-invoice route
// and the credit note of a changed order, so both PDFs render the same way.

/**
 * @param {Object} invoice - invoice document or snapshot with orderDetails, companyDetails, amount
 * @param {Array} sandwichOptions - products from PRODUCT_QUERY
 */
export function invoiceToEmailData(invoice, sandwichOptions) {
  const orderDetails = { ...invoice.orderDetails };

  // Sanity stores customSelection as an array; the PDF wants it keyed by product id.
  if (orderDetails.selectionType === "custom" && Array.isArray(orderDetails.customSelection)) {
    orderDetails.customSelection = orderDetails.customSelection.reduce((acc, item) => {
      // Use sandwichId._ref as the key (the actual product ID), not _key
      if (item.sandwichId && item.sandwichId._ref) {
        acc[item.sandwichId._ref] = item.selections;
      }
      return acc;
    }, {});
  }

  return {
    quoteId: invoice.quoteId,
    invoiceNumber: invoice.invoiceNumber || null,
    email: orderDetails.email,
    fullName: orderDetails.name,
    orderDetails: {
      ...orderDetails,
      selectionType: orderDetails.selectionType || "custom",
      allergies: orderDetails.allergies || "",
      customSelection: orderDetails.customSelection || {},
      varietySelection: orderDetails.varietySelection || {
        vega: 0,
        nonVega: 0,
        vegan: 0,
      },
      addDrinks: orderDetails.addDrinks || false,
      drinks: orderDetails.drinks || null,
      paymentMethod: "invoice",
    },
    deliveryDetails: {
      deliveryDate: orderDetails.deliveryDate,
      deliveryTime: orderDetails.deliveryTime || "12:00",
      phoneNumber: orderDetails.phoneNumber || "",
      address: {
        street: orderDetails.street || "",
        houseNumber: orderDetails.houseNumber || "",
        houseNumberAddition: orderDetails.houseNumberAddition || "",
        postalCode: orderDetails.postalCode || "",
        city: orderDetails.city || "",
      },
    },
    // Use companyDetails.address for invoice address (already correctly set during invoice creation)
    invoiceDetails: {
      address: invoice.companyDetails?.address || {},
    },
    companyDetails: {
      ...invoice.companyDetails,
      referenceNumber: invoice.referenceNumber || null,
    },
    amount: invoice.amount,
    dueDate: invoice.dueDate,
    sandwichOptions,
  };
}
