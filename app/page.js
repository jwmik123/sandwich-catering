"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Utensils,
  FileText,
  Calendar,
  Building2,
  CreditCard,
  FileSearch,
} from "lucide-react";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY, DRINK_QUERY, POPUP_CONFIG_QUERY } from "@/sanity/lib/queries";
import Wizard from "@/app/components/wizard/Wizard";
import SandwichAmountStep from "@/app/components/steps/SandwichAmountStep";
import SelectionTypeStep from "@/app/components/steps/SelectionTypeStep";
import OrderSummaryStep from "@/app/components/steps/OrderSummaryStep";
import DeliveryStep from "@/app/components/steps/DeliveryStep";
import ContactStep from "@/app/components/steps/ContactStep";
import PaymentStep from "@/app/components/steps/PaymentStep";
import UpsellPopup from "@/app/components/UpsellPopup";
import { useOrderForm } from "@/app/hooks/useOrderForm";
import { useOrderValidation } from "@/app/hooks/useOrderValidation";

const Home = () => {
  const [sandwichOptions, setSandwichOptions] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [popupConfig, setPopupConfig] = useState(null);
  const [showUpsellPopup, setShowUpsellPopup] = useState(false);
  const [date, setDate] = useState(null);
  const {
    formData,
    updateFormData,
    deliveryCost,
    deliveryError,
    totalAmount,
    restoreQuote,
  } = useOrderForm(drinks);

  const { isStepValid, getValidationMessage } = useOrderValidation(formData, deliveryError);

  const handleBeforeNext = (step) => {
    // Step 2 is the Selection Type step
    if (step === 2) {
      // Check if we should show the upsell popup
      const hasShown = typeof window !== "undefined" && localStorage.getItem("varietyPopupShown");

      if (
        formData.selectionType === "variety" &&
        popupConfig &&
        popupConfig.active &&
        !hasShown &&
        popupConfig.products &&
        popupConfig.products.length > 0
      ) {
        const currentTotal = Object.values(formData.varietySelection).reduce(
          (sum, val) => sum + (val || 0),
          0
        );

        if (currentTotal >= 15) {
          setShowUpsellPopup(true);
          return false; // Don't proceed yet
        }
      }
    }
    return true; // Proceed normally
  };

  const handleRemoveAddon = (addonId) => {
    const updatedUpsellAddons = (formData.upsellAddons || []).filter(
      (addon) => addon.id !== addonId
    );
    updateFormData("upsellAddons", updatedUpsellAddons);
  };

  const handleAddProducts = (productsToAdd) => {
    // Add products to the upsellAddons field (NOT customSelection)
    const updatedUpsellAddons = [...(formData.upsellAddons || [])];

    productsToAdd.forEach(({ product, quantity, toppings = [] }) => {
      const toppingCost = toppings.reduce((sum, toppingName) => {
        const toppingOption = product.toppingOptions?.find((t) => t.name === toppingName);
        return sum + (toppingOption?.price || 0);
      }, 0);
      const totalPrice = product.price + toppingCost;

      // Check if product already exists
      const existingIndex = updatedUpsellAddons.findIndex(
        (item) => item.id === product._id
      );

      if (existingIndex >= 0) {
        // Update existing product quantity
        updatedUpsellAddons[existingIndex].quantity += quantity;
        updatedUpsellAddons[existingIndex].subTotal =
          updatedUpsellAddons[existingIndex].quantity * totalPrice;
      } else {
        // Add new product
        updatedUpsellAddons.push({
          id: product._id,
          name: product.name,
          price: totalPrice,
          toppings,
          quantity: quantity,
          subTotal: quantity * totalPrice,
        });
      }
    });

    updateFormData("upsellAddons", updatedUpsellAddons);
    setShowUpsellPopup(false);

    // Proceed to next step
    setCurrentStep(3);
  };

  const handleClosePopup = () => {
    setShowUpsellPopup(false);
    // Proceed to next step
    setCurrentStep(3);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const products = await client.fetch(PRODUCT_QUERY);
      setSandwichOptions(products);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchDrinks = async () => {
      const drinksData = await client.fetch(DRINK_QUERY);
      setDrinks(drinksData);
    };
    fetchDrinks();
  }, []);

  useEffect(() => {
    const fetchPopupConfig = async () => {
      const config = await client.fetch(POPUP_CONFIG_QUERY);
      setPopupConfig(config);
    };
    fetchPopupConfig();
  }, []);

  const [currentStep, setCurrentStep] = useState(() => {
    // Check if we're restoring a quote (client-side only)
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get("restore") ? 3 : 1; // Step 3 is the overview step
    }
    return 1;
  });

  useEffect(() => {
    // Handle quote restoration
    const wasRestored = restoreQuote();
    if (wasRestored) {
      setCurrentStep(3);
    }
  }, [restoreQuote]);

  // Add useEffect to handle scrolling to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const commonButtonClasses =
    "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryButtonClasses = `${commonButtonClasses} bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`;
  const secondaryButtonClasses = `${commonButtonClasses} bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`;

  const steps = [
    { icon: Users, title: "Amount of sandwiches" },
    { icon: Utensils, title: "Offer" },
    { icon: FileText, title: "Summary" },
    { icon: Calendar, title: "Delivery" },
    { icon: Building2, title: "Company details" },
    { icon: CreditCard, title: "Payment" },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <SandwichAmountStep
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 2:
        return (
          <SelectionTypeStep
            formData={formData}
            updateFormData={updateFormData}
            sandwichOptions={sandwichOptions}
            drinks={drinks}
          />
        );
      case 3:
        return (
          <OrderSummaryStep
            formData={formData}
            updateFormData={updateFormData}
            setCurrentStep={setCurrentStep}
            sandwichOptions={sandwichOptions}
            drinks={drinks}
            secondaryButtonClasses={secondaryButtonClasses}
            totalAmount={totalAmount}
            onRemoveAddon={handleRemoveAddon}
          />
        );
      case 4:
        return (
          <DeliveryStep
            formData={formData}
            updateFormData={updateFormData}
            date={date}
            setDate={setDate}
            deliveryError={deliveryError}
            deliveryCost={deliveryCost}
          />
        );
      case 5:
        return (
          <ContactStep
            formData={formData}
            updateFormData={updateFormData}
            sandwichOptions={sandwichOptions}
            deliveryCost={deliveryCost}
            totalAmount={totalAmount}
          />
        );
      case 6:
        return (
          <PaymentStep
            formData={formData}
            updateFormData={updateFormData}
            totalAmount={totalAmount}
            deliveryCost={deliveryCost}
            deliveryError={deliveryError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Wizard
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        steps={steps}
        isStepValid={isStepValid}
        getValidationMessage={getValidationMessage}
        secondaryButtonClasses={secondaryButtonClasses}
        primaryButtonClasses={primaryButtonClasses}
        onBeforeNext={handleBeforeNext}
      >
        {renderStepContent()}
      </Wizard>

      {/* Upsell Popup */}
      {showUpsellPopup && popupConfig && (
        <UpsellPopup
          isOpen={showUpsellPopup}
          onClose={handleClosePopup}
          config={popupConfig}
          onAddProducts={handleAddProducts}
        />
      )}

      {/* Quote Lookup Link */}
      <div className="flex justify-between items-center mt-6 container mx-auto px-4">
        <Link
          href="/quote/lookup"
          className="flex gap-2 items-center px-4 py-2 text-gray-400 rounded-md"
        >
          <FileSearch className="w-4 h-4" />
          Load quote
        </Link>
      </div>
    </>
  );
};

export default Home;
