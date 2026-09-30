// Moved unchanged from the old ContactStep ("Download Invoice Preview").
import { toast } from "react-toastify";
import { PAYMENT_TERM_DAYS } from "@/app/assets/constants";

export const downloadInvoicePreview = async ({ formData, deliveryCost, sandwichOptions }) => {
  try {
    // Calculate total amount including delivery costs
    let calculatedAmount = 0;
    if (formData.selectionType === "custom") {
      calculatedAmount = Object.values(formData.customSelection)
        .flat()
        .reduce((total, selection) => total + selection.subTotal, 0);
    } else {
      calculatedAmount = formData.totalSandwiches * 7.30;

      // Add upsell addons for variety orders
      if (formData.upsellAddons && formData.upsellAddons.length > 0) {
        const addonsTotal = formData.upsellAddons.reduce(
          (total, addon) => total + addon.subTotal,
          0
        );
        calculatedAmount += addonsTotal;
      }
    }

    // Add delivery cost if present
    const finalAmount = calculatedAmount + (deliveryCost || 0);

    // Call the API to generate PDF
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteId: `PREVIEW-${Date.now()}`,
        orderDetails: {
          totalSandwiches: formData.totalSandwiches,
          selectionType: formData.selectionType,
          customSelection: formData.customSelection,
          varietySelection: formData.varietySelection,
          upsellAddons: formData.upsellAddons || [],
          addDrinks: true,
          drinks: formData.drinks || null,
          allergies: formData.allergies,
          deliveryCost: deliveryCost || 0, // Include delivery cost in order details
        },
        deliveryDetails: {
          deliveryDate: formData.deliveryDate,
          deliveryTime: formData.deliveryTime,
          address: {
            street: formData.street,
            houseNumber: formData.houseNumber,
            houseNumberAddition: formData.houseNumberAddition,
            postalCode: formData.postalCode,
            city: formData.city,
          },
          phoneNumber: formData.phoneNumber,
        },
        invoiceDetails: {
          sameAsDelivery: formData.sameAsDelivery,
          address: formData.sameAsDelivery
            ? {
                street: formData.street,
                houseNumber: formData.houseNumber,
                houseNumberAddition: formData.houseNumberAddition,
                postalCode: formData.postalCode,
                city: formData.city,
              }
            : {
                street: formData.invoiceStreet,
                houseNumber: formData.invoiceHouseNumber,
                houseNumberAddition: formData.invoiceHouseNumberAddition,
                postalCode: formData.invoicePostalCode,
                city: formData.invoiceCity,
              },
        },
        companyDetails: {
          isCompany: formData.isCompany,
          name: formData.companyName,
          vatNumber: formData.companyVAT,
          referenceNumber: formData.referenceNumber,
          address: {
            street: formData.street,
            houseNumber: formData.houseNumber,
            houseNumberAddition: formData.houseNumberAddition,
            postalCode: formData.postalCode,
            city: formData.city,
          },
        },
        amount: finalAmount, // Use total including delivery
        dueDate: new Date(Date.now() + PAYMENT_TERM_DAYS * 24 * 60 * 60 * 1000),
        sandwichOptions: sandwichOptions,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to generate PDF");
    }

    // Convert base64 to blob and create download link
    const binaryString = window.atob(data.pdf);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-preview-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF. Please try again.");
  }
};
