"use client";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY, DRINK_QUERY, POPUP_CONFIG_QUERY, SITE_SETTINGS_QUERY } from "@/sanity/lib/queries";
import UpsellPopup from "@/app/components/UpsellPopup";
import StartScreen from "@/app/components/order/StartScreen";
import ComposeCustom from "@/app/components/order/ComposeCustom";
import ComposeVariety from "@/app/components/order/ComposeVariety";
import Checkout from "@/app/components/order/Checkout";
import { OrderHeader } from "@/app/components/order/ui";
import { useOrderForm } from "@/app/hooks/useOrderForm";
import { useOrderValidation } from "@/app/hooks/useOrderValidation";
import {
  trackAmountStep,
  trackFunnelStep,
} from "@/lib/gtm";
import { buildReorderFormData, forgetLastOrder, getLastOrder } from "@/lib/last-order";

// The order flow has three screens:
//   1. start   – number of sandwiches, delivery date, variety or custom
//   2. compose – the menu (custom) or the mix (variety)
//   3. checkout – delivery, contact details and payment on one page
const START = 1;
const COMPOSE = 2;
const CHECKOUT = 3;
const STEP_PARAMS = { [COMPOSE]: "choose", [CHECKOUT]: "checkout" };
const STEP_BY_PARAM = { choose: COMPOSE, checkout: CHECKOUT };

const Home = () => {
  const [sandwichOptions, setSandwichOptions] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [popupConfig, setPopupConfig] = useState(null);
  const [disabledDates, setDisabledDates] = useState([]);
  const [showUpsellPopup, setShowUpsellPopup] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  // Addons picked in the upsell popup, held until the popup closes so the
  // step 2 event can be built from the selection including them.
  const pendingUpsellAddons = useRef(null);
  const {
    formData,
    setFormData,
    updateFormData,
    deliveryCost,
    deliveryError,
    totalAmount,
    calculateTotal,
    restoreQuote,
  } = useOrderForm(drinks);

  const { isStepValid, getValidationMessage } = useOrderValidation(formData, deliveryError);

  // The upsell popup can add addons after the user clicks next, so the step 2
  // event is built from the selection as it stands when we actually advance.
  const trackChooseSandwiches = (overrides = {}) => {
    const selection = { ...formData, ...overrides };
    trackFunnelStep({
      stepName: "choose_sandwiches",
      stepNumber: 2,
      formData: selection,
      sandwichOptions,
      drinks,
      totalAmount: calculateTotal(selection),
    });
  };

  const [currentStep, setCurrentStep] = useState(() => {
    // Check if we're restoring a quote (client-side only)
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get("restore") ? CHECKOUT : START;
    }
    return START;
  });

  // Every screen gets its own browser history entry, so the browser's back
  // and forward buttons move between the steps instead of leaving the site.
  // Native pushState keeps this page mounted (Next.js patches it to stay in
  // sync); the step is always read back from the URL.
  const stepFromUrl = () => {
    const param = new URLSearchParams(window.location.search).get("step");
    return STEP_BY_PARAM[param] || START;
  };
  const writeStepToHistory = (step, replace) => {
    const url = step === START ? "/" : `/?step=${STEP_PARAMS[step]}`;
    // Already on this step (e.g. the upsell popup closing): no extra entry.
    const same = stepFromUrl() === step && !window.location.search.includes("restore");
    // Next.js fills in its own router state for the new entry.
    window.history[replace || same ? "replaceState" : "pushState"](null, "", url);
  };
  const goToStep = (step, { replace = false } = {}) => {
    setCurrentStep(step);
    if (typeof window === "undefined") return;
    // Next.js hooks into history after this page's first effects have run.
    window.setTimeout(() => writeStepToHistory(step, replace), 0);
  };

  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // After a refresh the order is gone, so always start at the beginning.
    // (A restored quote rewrites the URL itself once it is loaded.)
    if (params.get("step") && !params.get("restore")) goToStep(START, { replace: true });

    const onPopState = () => {
      let step = stepFromUrl();
      // Nothing to show on a later step without an order in progress.
      if (step !== START && !formDataRef.current.selectionType) step = START;
      setShowUpsellPopup(false);
      setCurrentStep(step);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // Once, on mount.
  }, []);

  const handleChooseType = (selectionType) => {
    if (!isStepValid(1)) {
      toast.error("The minimum order is 20 sandwiches", { toastId: "start-validation" });
      return;
    }
    trackAmountStep(formData.totalSandwiches);
    updateFormData("selectionType", selectionType);
    goToStep(COMPOSE);
  };

  const handleComposeContinue = () => {
    if (!isStepValid(2)) {
      const message = getValidationMessage(2);
      if (message) toast.error(message, { toastId: "compose-validation" });
      return;
    }

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
      if (currentTotal >= 20) {
        setShowUpsellPopup(true);
        return; // The popup moves on to checkout when it closes
      }
    }
    trackChooseSandwiches();
    goToStep(CHECKOUT);
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
    // UpsellPopup always calls onClose right after this, and that is where the
    // step 2 event is sent — otherwise it would fire twice.
    pendingUpsellAddons.current = updatedUpsellAddons;
    goToStep(CHECKOUT);
  };

  const handleClosePopup = () => {
    setShowUpsellPopup(false);
    const addons = pendingUpsellAddons.current;
    pendingUpsellAddons.current = null;
    trackChooseSandwiches(addons ? { upsellAddons: addons } : {});
    goToStep(CHECKOUT);
  };

  const handleReorder = () => {
    const restored = buildReorderFormData(lastOrder, formData, sandwichOptions);
    if (!restored) {
      toast.info("Your previous order is no longer on the menu. Please start a new one.");
      forgetLastOrder();
      setLastOrder(null);
      return;
    }
    setFormData(restored);
    // Recalculate the delivery cost for the restored postcode.
    if (restored.postalCode) updateFormData("postalCode", restored.postalCode);
    goToStep(CHECKOUT);
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

  useEffect(() => {
    const fetchSiteSettings = async () => {
      const settings = await client.fetch(SITE_SETTINGS_QUERY);
      setDisabledDates(settings?.disabledDates || []);
    };
    fetchSiteSettings();
  }, []);

  useEffect(() => {
    setLastOrder(getLastOrder());
  }, []);

  useEffect(() => {
    // Handle quote restoration
    const wasRestored = restoreQuote();
    if (wasRestored) {
      goToStep(CHECKOUT, { replace: true });
    }
  }, [restoreQuote]);

  // The old wizard allowed one upsell popup per visit to the selection step.
  useEffect(() => {
    if (currentStep === COMPOSE) localStorage.removeItem("varietyPopupShown");
  }, [currentStep]);

  // The overview used to be its own step; it is now part of checkout, so the
  // order_summary event is sent each time checkout opens (once the order is
  // known, which matters for a restored quote).
  const summaryTracked = useRef(false);
  useEffect(() => {
    if (currentStep !== CHECKOUT) {
      summaryTracked.current = false;
      return;
    }
    if (summaryTracked.current || !formData.selectionType) return;
    summaryTracked.current = true;
    trackFunnelStep({
      stepName: "order_summary",
      stepNumber: 3,
      formData,
      sandwichOptions,
      drinks,
      totalAmount,
    });
    // Only when the screen opens, not on every edit.
  }, [currentStep, formData.selectionType]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  if (currentStep === START) {
    return (
      <StartScreen
        formData={formData}
        updateFormData={updateFormData}
        disabledDates={disabledDates}
        onChoose={handleChooseType}
        lastOrder={lastOrder}
        onReorder={handleReorder}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <OrderHeader phase={currentStep} onHome={() => goToStep(START)} />

      {currentStep === COMPOSE && formData.selectionType === "custom" && (
        <ComposeCustom
          formData={formData}
          updateFormData={updateFormData}
          sandwichOptions={sandwichOptions}
          drinks={drinks}
          totalAmount={totalAmount}
          onContinue={handleComposeContinue}
          onSwitchType={(type) => updateFormData("selectionType", type)}
        />
      )}

      {currentStep === COMPOSE && formData.selectionType !== "custom" && (
        <ComposeVariety
          formData={formData}
          updateFormData={updateFormData}
          sandwichOptions={sandwichOptions}
          drinks={drinks}
          totalAmount={totalAmount}
          onContinue={handleComposeContinue}
          onSwitchType={(type) => updateFormData("selectionType", type)}
          onRemoveAddon={handleRemoveAddon}
        />
      )}

      {currentStep === CHECKOUT && (
        <Checkout
          formData={formData}
          updateFormData={updateFormData}
          sandwichOptions={sandwichOptions}
          drinks={drinks}
          totalAmount={totalAmount}
          deliveryCost={deliveryCost}
          deliveryError={deliveryError}
          disabledDates={disabledDates}
          isStepValid={isStepValid}
          getValidationMessage={getValidationMessage}
          onEdit={() => goToStep(COMPOSE)}
          onRemoveAddon={handleRemoveAddon}
        />
      )}

      {/* Upsell Popup */}
      {showUpsellPopup && popupConfig && (
        <UpsellPopup
          isOpen={showUpsellPopup}
          onClose={handleClosePopup}
          config={popupConfig}
          onAddProducts={handleAddProducts}
        />
      )}
    </div>
  );
};

export default Home;
