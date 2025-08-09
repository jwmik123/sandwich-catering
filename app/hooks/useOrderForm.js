"use client";
import { useState, useEffect } from "react";
import { postalCodeDeliveryCosts } from "@/app/assets/postals";

export const useOrderForm = () => {
  const [formData, setFormData] = useState({
    // Stap 1
    totalSandwiches: 15,
    // Stap 3
    selectionType: "",
    allergies: "",
    varietySelection: {
      vega: 0,
      nonVega: 0,
      vegan: 0,
    },
    // Stap 5
    deliveryDate: "",
    deliveryTime: "",
    street: "",
    houseNumber: "",
    houseNumberAddition: "",
    postalCode: "",
    city: "",
    // Invoice address
    sameAsDelivery: true,
    invoiceStreet: "",
    invoiceHouseNumber: "",
    invoiceHouseNumberAddition: "",
    invoicePostalCode: "",
    invoiceCity: "",
    // Stap 6
    name: "",
    email: "",
    phoneNumber: "",
    isCompany: false,
    companyName: "",
    companyVAT: "",
    referenceNumber: "",
    // Stap 7
    paymentMethod: "",
    customSelection: {},
  });

  const [deliveryCost, setDeliveryCost] = useState(null);
  const [deliveryError, setDeliveryError] = useState(null);

  const calculateDeliveryCost = (postalCode, orderAmount) => {
    if (!postalCode) return null;
    // Format postal code - remove spaces and take first 4 digits
    const formattedPostal = postalCode.replace(/\s/g, "").substring(0, 4);
    // Check if postal code exists in our delivery zones
    const deliveryZone = postalCodeDeliveryCosts[formattedPostal];
    if (!deliveryZone) {
      return { error: "We do not deliver to this postal code." };
    }

    // For special always-charge postal codes
    if (typeof deliveryZone === "object" && deliveryZone.alwaysCharge) {
      return {
        cost: deliveryZone.cost,
      };
    }

    // For regular postal codes (not special zones)
    if (typeof deliveryZone === "number") {
      return {
        cost: orderAmount >= 100 ? 0 : deliveryZone,
      };
    }

    // For special zones (postal codes that require €100 for free delivery)
    if (typeof deliveryZone === "object") {
      return {
        cost: orderAmount >= 100 ? 0 : deliveryZone.cost,
      };
    }
  };

  const calculateTotal = (formData) => {
    let subtotal = 0;
    
    if (formData.selectionType === "custom") {
      subtotal = Object.values(formData.customSelection)
        .flat()
        .reduce((total, selection) => total + selection.subTotal, 0);
    } else {
      // For variety selection
      subtotal = formData.totalSandwiches * 6.83; // Assuming €6.83 per sandwich
    }
    
    // Add drinks pricing if drinks are selected
    if (formData.addDrinks && formData.drinks) {
      const drinksTotal = 
        (formData.drinks.verseJus || 0) * 3.62 +  // Fresh juice €3.62
        (formData.drinks.sodas || 0) * 2.71 +     // Sodas €2.71
        (formData.drinks.smoothies || 0) * 3.62;  // Smoothies €3.62
      subtotal += drinksTotal;
    }
    
    return subtotal; // excluding VAT
  };

  const totalAmount = calculateTotal(formData);

  // Effect to recalculate delivery cost when total amount changes
  useEffect(() => {
    if (formData.postalCode && totalAmount > 0) {
      const result = calculateDeliveryCost(formData.postalCode, totalAmount);
      if (result && !result.error) {
        setDeliveryCost(result.cost || null);

        // Update delivery messages based on new cost
        const formattedPostal = formData.postalCode
          .replace(/\s/g, "")
          .substring(0, 4);
        const deliveryZone = postalCodeDeliveryCosts[formattedPostal];

        if (typeof deliveryZone === "object" && deliveryZone.alwaysCharge) {
          setDeliveryError(``);
        } else if (result.cost > 0) {
          setDeliveryError(
            `Free delivery available for orders over €100 in your area`
          );
        } else if (result.cost === 0 && totalAmount >= 100) {
          setDeliveryError(null);
        }
      }
    }
  }, [totalAmount, formData.postalCode]);

  const updateFormData = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Log company details when they change
      if (
        field === "isCompany" ||
        field === "companyName" ||
        field === "companyVAT"
      ) {
        console.log("========= COMPANY DETAILS UPDATED =========");
        console.log("Company Details:", {
          isCompany: newData.isCompany,
          companyName: newData.companyName,
          companyVAT: newData.companyVAT,
        });
      }

      if (field === "postalCode") {
        const result = calculateDeliveryCost(value, totalAmount);
        if (result?.error) {
          setDeliveryError(result.error);
          setDeliveryCost(null);
        } else {
          setDeliveryError(null);
          setDeliveryCost(result?.cost || null);

          // Add message about delivery costs or free delivery threshold
          const formattedPostal = value.replace(/\s/g, "").substring(0, 4);
          const deliveryZone = postalCodeDeliveryCosts[formattedPostal];

          // Special case for postal codes that always have a delivery fee
          if (typeof deliveryZone === "object" && deliveryZone.alwaysCharge) {
            setDeliveryError(``);
          }
          // Regular case with minimum order for free delivery
          else if (typeof deliveryZone === "object" && result.cost > 0) {
            setDeliveryError(
              `Free delivery available for orders over €100 in your area`
            );
          } else if (result?.cost > 0) {
            setDeliveryError(
              `Free delivery available for orders over €100 in your area`
            );
          }
        }
      }
      return newData;
    });
  };

  // Restore quote functionality
  const restoreQuote = () => {
    // Check if we should restore a quote
    const searchParams = new URLSearchParams(window.location.search);
    const shouldRestore = searchParams.get("restore");

    if (shouldRestore) {
      const storedQuote = localStorage.getItem("restoreQuote");
      if (storedQuote) {
        try {
          const quote = JSON.parse(storedQuote);

          // Restore form data
          setFormData({
            // Step 1
            totalSandwiches: quote.orderDetails.totalSandwiches,
            // Step 3
            selectionType: quote.orderDetails.selectionType,
            customSelection:
              quote.orderDetails.selectionType === "custom"
                ? quote.orderDetails.customSelection.reduce((acc, item) => {
                    acc[item.sandwichId._id] = item.selections;
                    return acc;
                  }, {})
                : {},
            varietySelection: quote.orderDetails.varietySelection || {
              vega: 0,
              nonVega: 0,
              vegan: 0,
            },
            allergies: quote.orderDetails.allergies || "",
            // Step 5
            deliveryDate: quote.deliveryDetails.deliveryDate,
            deliveryTime: quote.deliveryDetails.deliveryTime,
            street: quote.deliveryDetails.address.street,
            houseNumber: quote.deliveryDetails.address.houseNumber,
            houseNumberAddition:
              quote.deliveryDetails.address.houseNumberAddition,
            postalCode: quote.deliveryDetails.address.postalCode,
            city: quote.deliveryDetails.address.city,
            // Step 6
            isCompany: !!quote.companyDetails,
            companyName: quote.companyDetails?.companyName || "",
            companyVAT: quote.companyDetails?.companyVAT || "",
            referenceNumber: quote.companyDetails?.referenceNumber || "",
          });

          // Clear the stored quote
          localStorage.removeItem("restoreQuote");

          return true; // Indicate that a quote was restored
        } catch (error) {
          console.error("Error restoring quote:", error);
        }
      }
    }
    return false;
  };

  return {
    formData,
    setFormData,
    updateFormData,
    deliveryCost,
    setDeliveryCost,
    deliveryError,
    setDeliveryError,
    totalAmount,
    calculateTotal,
    calculateDeliveryCost,
    restoreQuote,
  };
}; 