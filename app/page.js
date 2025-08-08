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
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import Wizard from "@/app/components/wizard/Wizard";
import SandwichAmountStep from "@/app/components/steps/SandwichAmountStep";
import SelectionTypeStep from "@/app/components/steps/SelectionTypeStep";
import OrderSummaryStep from "@/app/components/steps/OrderSummaryStep";
import DeliveryStep from "@/app/components/steps/DeliveryStep";
import ContactStep from "@/app/components/steps/ContactStep";
import PaymentStep from "@/app/components/steps/PaymentStep";
import { useOrderForm } from "@/app/hooks/useOrderForm";
import { useOrderValidation } from "@/app/hooks/useOrderValidation";

const Home = () => {
  const [sandwichOptions, setSandwichOptions] = useState([]);
  const [date, setDate] = useState(null);
  const {
    formData,
    updateFormData,
    deliveryCost,
    deliveryError,
    totalAmount,
    restoreQuote,
  } = useOrderForm();

  const { isStepValid, getValidationMessage } = useOrderValidation(formData, deliveryError);

  useEffect(() => {
    const fetchProducts = async () => {
      const products = await client.fetch(PRODUCT_QUERY);
      setSandwichOptions(products);
    };
    fetchProducts();
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
          />
        );
      case 3:
        return (
          <OrderSummaryStep
            formData={formData}
            updateFormData={updateFormData}
            setCurrentStep={setCurrentStep}
            sandwichOptions={sandwichOptions}
            secondaryButtonClasses={secondaryButtonClasses}
            totalAmount={totalAmount}
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
      >
        {renderStepContent()}
      </Wizard>

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
