"use client";
import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Users,
  Utensils,
  FileText,
  Calendar,
  Building2,
  CreditCard,
  FileSearch,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import { generateQuote } from "@/app/actions/generateQuote";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import MenuCategories from "@/app/components/MenuCategories";
import { breadTypes } from "@/app/assets/constants";
import VarietySelector from "@/app/components/VarietySelector";
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import DeliveryCalendar from "@/app/components/DeliveryCalendar";
import QuoteButton from "@/app/components/QuoteButton";
import Image from "next/image";
import { postalCodeDeliveryCosts } from "@/app/assets/postals";
const Home = () => {
  const [sandwichOptions, setSandwichOptions] = useState([]);
  const [date, setDate] = useState(null);
  const [deliveryCost, setDeliveryCost] = useState(null);
  const [deliveryError, setDeliveryError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const products = await client.fetch(PRODUCT_QUERY);
      setSandwichOptions(products);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
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
          });

          // Clear the stored quote
          localStorage.removeItem("restoreQuote");

          // Set step to 3
          setCurrentStep(3);
        } catch (error) {
          console.error("Error restoring quote:", error);
        }
      }
    }
  }, []);

  const [currentStep, setCurrentStep] = useState(() => {
    // Check if we're restoring a quote (client-side only)
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get("restore") ? 3 : 1; // Step 3 is the overview step
    }
    return 1;
  });

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
    // Stap 6
    email: "",
    phoneNumber: "",
    isCompany: false,
    companyName: "",
    companyVAT: "",
    // Stap 7
    paymentMethod: "",
    customSelection: {},
  });

  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return formData.totalSandwiches >= 15; // Minimum order requirement
      case 2:
        if (formData.selectionType === "custom") {
          const totalSelected = Object.values(formData.customSelection)
            .flat()
            .reduce((total, selection) => total + selection.quantity, 0);
          return totalSelected >= formData.totalSandwiches;
        }
        return (
          formData.selectionType === "variety" &&
          formData.varietySelection.vega +
            formData.varietySelection.nonVega +
            formData.varietySelection.vegan >=
            formData.totalSandwiches
        );
      case 3:
        return true; // Overview step is always valid
      case 4:
        // Validate delivery details
        return (
          formData.deliveryDate &&
          formData.deliveryTime &&
          formData.street &&
          formData.houseNumber &&
          formData.postalCode &&
          formData.city &&
          deliveryError !== "We do not deliver to this postal code."
        );

      case 5:
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = emailRegex.test(formData.email);

        // Validate phone number (basic Dutch format)
        const phoneRegex =
          /^((\+|00(\s|\s?\-\s?)?)31(\s|\s?\-\s?)?(\(0\)[\-\s]?)?|0)[1-9]((\s|\s?\-\s?)?[0-9])((\s|\s?-\s?)?[0-9])((\s|\s?-\s?)?[0-9])\s?[0-9]\s?[0-9]\s?[0-9]\s?[0-9]\s?[0-9]$/;
        const isPhoneValid = phoneRegex.test(formData.phoneNumber);

        // Base validation
        let isValid = isEmailValid && isPhoneValid;

        // Additional company validation if isCompany is checked
        if (formData.isCompany) {
          isValid =
            isValid &&
            formData.companyName.trim() !== "" &&
            formData.companyVAT.trim() !== "";
        }

        return isValid;
      default:
        return true;
    }
  };

  // Add this function to get validation message
  const getValidationMessage = (step) => {
    switch (step) {
      case 2:
        if (formData.selectionType === "custom") {
          const totalSelected = Object.values(formData.customSelection)
            .flat()
            .reduce((total, selection) => total + selection.quantity, 0);
          const remaining = formData.totalSandwiches - totalSelected;
          if (remaining > 0) {
            return `Please select ${remaining} sandwich${
              remaining === 1 ? "" : "es"
            }`;
          }
          // if (remaining < 0) {
          //   return `U heeft ${Math.abs(remaining)} broodje${
          //     Math.abs(remaining) === 1 ? "" : "s"
          //   } te veel geselecteerd`;
          // }
        }
        if (formData.selectionType === "variety") {
          const total =
            formData.varietySelection.vega +
            formData.varietySelection.nonVega +
            formData.varietySelection.vegan;

          if (Number(total) !== Number(formData.totalSandwiches)) {
            return `The total must be ${formData.totalSandwiches} sandwiches`;
          }
        }
        return "";
      case 4:
        return "Please fill in all fields";
      default:
        return "";
    }
  };

  const calculateTotal = (formData) => {
    if (formData.selectionType === "custom") {
      const subtotal = Object.values(formData.customSelection)
        .flat()
        .reduce((total, selection) => total + selection.subTotal, 0);
      return subtotal; // excluding VAT
    } else {
      // For variety selection
      return formData.totalSandwiches * 6.38; // Assuming €6.38 per sandwich + 9% VAT
    }
  };

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
        cost: orderAmount >= 75 ? 0 : deliveryZone,
      };
    }

    // For special zones (postal codes that require €100 for free delivery)
    if (typeof deliveryZone === "object") {
      return {
        cost: orderAmount >= 100 ? 0 : deliveryZone.cost,
      };
    }
  };

  const totalAmount = calculateTotal(formData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // First generate the quote
      const result = await generateQuote({
        ...formData,
        deliveryCost: deliveryCost || 0,
      });

      if (result.success) {
        if (paymentMethod === "invoice") {
          // Handle invoice payment
          const invoiceResponse = await fetch("/api/create-invoice", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quoteId: result.quoteId,
              amount: (totalAmount + (deliveryCost || 0)) * 1.09, // Include VAT
              orderDetails: { ...formData, deliveryCost: deliveryCost || 0 },
            }),
          });

          const invoiceData = await invoiceResponse.json();

          if (invoiceData.success) {
            // Redirect to success page
            window.location.href = `/payment/success?quoteId=${result.quoteId}&type=invoice`;
          }
        } else {
          // Handle online payment via Mollie
          const paymentResponse = await fetch("/api/create-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quoteId: result.quoteId,
              amount: (totalAmount + (deliveryCost || 0)) * 1.09, // Include VAT
              orderDetails: { ...formData, deliveryCost: deliveryCost || 0 },
            }),
          });

          const paymentData = await paymentResponse.json();

          if (paymentData.success) {
            window.location.href = paymentData.checkoutUrl;
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      // Show error message to user
    } finally {
      setIsProcessing(false);
    }
  };

  const commonButtonClasses =
    "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryButtonClasses = `${commonButtonClasses} bg-black text-white hover:bg-gray-800 focus:ring-gray-500`;
  const secondaryButtonClasses = `${commonButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500`;

  const updateFormData = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
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
              `Free delivery available for orders over €75 in your area`
            );
          }
        }
      }
      return newData;
    });
  };

  const renderCombinedSteps = () => (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <Users className="w-5 h-5" />
        <h2>Amount of sandwiches</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-row w-full md:w-1/2">
          {/* Number of People section */}
          <div className="w-full">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full mb-4">
                <Label htmlFor="peopleSelect">
                  How many sandwiches would you like?
                </Label>
                <Select
                  value={formData.totalSandwiches.toString()}
                  onValueChange={(value) =>
                    updateFormData("totalSandwiches", value)
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select number of sandwiches" />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 50, 100, 200, 300, 500].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} sandwiches
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full mb-8">
                <Label htmlFor="peopleInput">Or enter a specific number:</Label>
                <Input
                  id="peopleInput"
                  type="number"
                  min="1"
                  value={formData.totalSandwiches}
                  onChange={(e) =>
                    updateFormData("totalSandwiches", e.target.value)
                  }
                  className="mt-1"
                  placeholder="Enter number of sandwiches"
                />
              </div>
            </div>

            <div className="w-full">
              <div className="space-y-6">
                <div className="bg-beige-50 p-4 rounded-md text-sm text-green-500 bg-green-50">
                  <p>* We recommend 2 sandwiches per person</p>
                  <p>* Minimum 15 sandwiches</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-6 rounded-lg w-full md:w-1/2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-sm text-gray-500">
                Total number of sandwiches
              </p>
              <p className="text-lg font-medium">{formData.totalSandwiches}</p>
              {formData.totalSandwiches < 15 &&
                formData.totalSandwiches > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    * Minimum 15 sandwiches
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
          <Utensils className="w-5 h-5" />
          <h2>Choose your Selection</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.selectionType === "custom"
                ? "border-black bg-beige-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => updateFormData("selectionType", "custom")}
          >
            <h3 className="text-lg font-medium mb-2">
              Create your own selection
            </h3>
            <p className="text-sm text-gray-600">Choose your sandwiches</p>
          </div>

          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.selectionType === "variety"
                ? "border-black bg-beige-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => updateFormData("selectionType", "variety")}
          >
            <h3 className="text-lg font-medium mb-2">Variety Offer</h3>
            <p className="text-sm text-gray-600">Let us surprise you! :)</p>
          </div>
        </div>

        {formData.selectionType === "custom" && (
          <div className="mt-6">
            <MenuCategories
              sandwichOptions={sandwichOptions}
              formData={formData}
              updateFormData={updateFormData}
            />

            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Selected items</p>
                  <p className="text-lg font-medium">
                    {Object.values(formData.customSelection)
                      .flat()
                      .reduce(
                        (total, selection) => total + selection.quantity,
                        0
                      )}{" "}
                    / {formData.totalSandwiches}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total amount</p>
                  <p className="text-lg font-medium">
                    €
                    {Object.values(formData.customSelection)
                      .flat()
                      .reduce(
                        (total, selection) => total + selection.subTotal,
                        0
                      )
                      .toFixed(2)}{" "}
                    excl. VAT
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.selectionType === "variety" && (
          <>
            <div className="space-y-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900">
                Choose a distribution
              </h3>
              <VarietySelector
                totalSandwiches={formData.totalSandwiches}
                formData={formData}
                updateFormData={updateFormData}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <FileText className="w-5 h-5" />
        <h2>Order summary</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">
                Total number of sandwiches
              </p>
              <p className="text-lg font-medium">{formData.totalSandwiches}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type of order</p>
              <p className="text-lg font-medium">
                {formData.selectionType === "custom"
                  ? "Create your own selection"
                  : "Variety offer"}
              </p>
            </div>
          </div>

          {formData.selectionType === "custom" ? (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">Selected sandwiches</p>
              <div className="space-y-4">
                {Object.entries(formData.customSelection)
                  .filter(([_, selections]) => selections?.length > 0)
                  .map(([id, selections]) => {
                    const sandwich = sandwichOptions.find((s) => s._id === id);
                    return (
                      <div key={id} className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {sandwich?.name || "Onbekend broodje"}
                        </div>
                        {selections.map((selection, index) => {
                          const breadType = breadTypes.find(
                            (b) => b.id === selection.breadType
                          )?.name;

                          return (
                            <div
                              key={index}
                              className="flex justify-between text-sm pl-4"
                            >
                              <span className="text-gray-600">
                                {selection.quantity}x - {breadType}
                                {selection.sauce !== "geen" &&
                                  ` met ${selection.sauce}`}
                              </span>
                              <span className="text-gray-900 font-medium">
                                €{selection.subTotal.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total amount</span>
                  <span>
                    €
                    {Object.values(formData.customSelection)
                      .flat()
                      .reduce(
                        (total, selection) => total + selection.subTotal,
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Total number of sandwiches</span>
                  <span>
                    {Object.values(formData.customSelection)
                      .flat()
                      .reduce(
                        (total, selection) => total + selection.quantity,
                        0
                      )}{" "}
                    / {formData.totalSandwiches} sandwiches
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">
                Distribution of sandwiches
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Chicken, Meat, Fish</span>
                  <span>{formData.varietySelection.nonVega} sandwiches</span>
                </div>
                <div className="flex justify-between">
                  <span>Vegetarian</span>
                  <span>{formData.varietySelection.vega} sandwiches</span>
                </div>
                <div className="flex justify-between">
                  <span>Vegan</span>
                  <span>{formData.varietySelection.vegan} sandwiches</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formData.totalSandwiches} sandwiches</span>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total amount</span>
                  <span>€{(formData.totalSandwiches * 6.38).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Total number of sandwiches</span>
                  <span>
                    {formData.totalSandwiches}/ {formData.totalSandwiches}{" "}
                    sandwiches
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="allergies" className="text-base">
            Allergies or comments?
          </Label>
          <Textarea
            placeholder="Add allergies or comments"
            className="mt-2"
            value={formData.allergies}
            onChange={(e) => updateFormData("allergies", e.target.value)}
          />
        </div>
        <div className="border-t pt-4 mt-4">
          <QuoteButton
            formData={formData}
            sandwichOptions={sandwichOptions}
            buttonClasses={secondaryButtonClasses}
          />
        </div>

        <button
          onClick={() => setCurrentStep(2)}
          className="w-full px-4 py-2 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Change order
        </button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <>
      <DeliveryCalendar
        updateFormData={updateFormData}
        date={date}
        setDate={setDate}
        formData={formData}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            type="text"
            value={formData.street}
            onChange={(e) => updateFormData("street", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="houseNumber">House number</Label>
            <Input
              id="houseNumber"
              type="text"
              value={formData.houseNumber}
              onChange={(e) => updateFormData("houseNumber", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="houseNumberAddition">Addition</Label>
            <Input
              id="houseNumberAddition"
              type="text"
              value={formData.houseNumberAddition}
              onChange={(e) =>
                updateFormData("houseNumberAddition", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postcode</Label>
          <Input
            id="postalCode"
            type="text"
            value={formData.postalCode}
            onChange={(e) => updateFormData("postalCode", e.target.value)}
            required
          />
          {deliveryError && (
            <p className="text-red-500  text-sm mt-1">{deliveryError}</p>
          )}
          {deliveryCost === 0 && (
            <p className="text-green-500 text-sm mt-1">Free delivery!</p>
          )}
          {deliveryCost > 0 && (
            <p className="text-gray-600 text-sm mt-1">
              Delivery cost: €{deliveryCost.toFixed(2)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => updateFormData("city", e.target.value)}
            required
          />
        </div>
      </div>
    </>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <Building2 className="w-5 h-5" />
        <h2>Contact and Company details</h2>
      </div>

      <div className="space-y-4">
        {/* Contact Details */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-700">Contact details</h3>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail address*</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone number* (Contact person at location during delivery)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => updateFormData("phoneNumber", e.target.value)}
              placeholder="06 12345678"
              required
            />
          </div>
        </div>

        {/* Company Details Section */}
        <div className="pt-6 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isCompany"
              checked={formData.isCompany}
              onCheckedChange={(checked) =>
                updateFormData("isCompany", checked)
              }
            />
            <Label
              htmlFor="isCompany"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              This is a business order
            </Label>
          </div>

          {formData.isCompany && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    updateFormData("companyName", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyVAT">VAT number</Label>
                <Input
                  id="companyVAT"
                  type="text"
                  value={formData.companyVAT}
                  onChange={(e) => updateFormData("companyVAT", e.target.value)}
                  placeholder="NL123456789B01"
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <CreditCard className="w-5 h-5" />
        <h2>Payment</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">€{totalAmount.toFixed(2)}</span>
          </div>
          {deliveryCost !== null ? (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Delivery:</span>
              <span className="font-medium">
                {deliveryCost === 0 ? "Free" : `€${deliveryCost.toFixed(2)}`}
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Delivery:</span>
              <span className="font-medium text-green-600">Free</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">VAT (9%):</span>
            <span className="font-medium">
              €{((totalAmount + (deliveryCost || 0)) * 0.09).toFixed(2)}
            </span>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold">
                €{((totalAmount + (deliveryCost || 0)) * 1.09).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {deliveryError && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{deliveryError}</p>
          </div>
        )}
      </div>

      {/* Payment Method Selection - Only show for companies */}
      {formData.isCompany && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Choose your payment method:</p>

          <div className="space-y-3">
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === "online"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-green-300"
              }`}
              onClick={() => setPaymentMethod("online")}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={paymentMethod === "online"}
                  onChange={() => setPaymentMethod("online")}
                  className="text-green-600 focus:ring-green-500"
                />
                <div>
                  <p className="font-medium">Pay directly online</p>
                  <p className="text-sm text-gray-500">
                    iDEAL, creditcard, etc.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === "invoice"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-green-300"
              }`}
              onClick={() => setPaymentMethod("invoice")}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={paymentMethod === "invoice"}
                  onChange={() => setPaymentMethod("invoice")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium">Pay via invoice</p>
                  <p className="text-sm text-gray-500">
                    Within 14 days of invoice date
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className={`w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium 
          hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 
          focus:ring-offset-2 transition-colors 
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center justify-center gap-2">
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>
                {paymentMethod === "invoice"
                  ? "Place order"
                  : "Continue to payment"}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );

  const steps = [
    { icon: Users, title: "Amount of sandwiches" },
    { icon: Utensils, title: "Offer" },
    { icon: FileText, title: "Summary" },
    { icon: Calendar, title: "Delivery" },
    { icon: Building2, title: "Company details" },
    { icon: CreditCard, title: "Payment" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="text-sm text-center bg-green-500 text-white p-2 flex space-x-2 justify-center items-center">
            <span className="font-bold">Free delivery from €75,- </span>
            <span className="italic text-xs">
              some areas excluded (1026-1028, 1035, 1101-1109).
            </span>
          </div>
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between">
              <Image
                src={"/tsb-logo.png"}
                alt="The Sandwichbar Amsterdam Logo"
                className="w-10 h-10 md:w-16 md:h-16"
                width={100}
                height={100}
              />
              {/* Back Button */}
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className={`${secondaryButtonClasses} flex items-center gap-2`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Go back
                </button>
              )}

              {/* Progress Text */}
              <div className="text-sm font-medium text-gray-500">
                Step {currentStep} of {steps.length}
              </div>

              {/* Next Button */}
              {currentStep < steps.length && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      const validationMessage =
                        getValidationMessage(currentStep);
                      if (!isStepValid(currentStep) && validationMessage) {
                        toast.error(validationMessage);
                      } else if (isStepValid(currentStep)) {
                        setCurrentStep((prev) => prev + 1);
                      }
                    }}
                    className={`${primaryButtonClasses} flex items-center gap-2 ${
                      !isStepValid(currentStep) ? "opacity-50" : ""
                    }`}
                  >
                    {currentStep === steps.length - 1 ? "Payment" : "Next"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={index}
                  className={`flex flex-col items-center ${
                    index + 1 === currentStep
                      ? "text-black"
                      : index + 1 < currentStep
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-current">
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 hidden md:block">
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-black rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 pb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            {currentStep === 1 && renderCombinedSteps()}
            {currentStep === 2 && renderStep3()}
            {currentStep === 3 && renderStep4()}
            {currentStep === 4 && renderStep5()}
            {currentStep === 5 && renderStep6()}
            {currentStep === 6 && renderStep7()}
          </div>

          {/* Quote Lookup Link */}
          <div className="mt-6 flex justify-between items-center">
            <Link
              href="/quote/lookup"
              className="text-gray-400 px-4 py-2 underline rounded-md flex items-center gap-2"
            >
              <FileSearch className="w-4 h-4" />
              Load quote
            </Link>
            <span className="text-sm text-gray-500">
              <Link href="https://mikdevelopment.nl" target="_blank">
                <span className="text-sm text-gray-400">
                  Powered by Mik Development
                </span>
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
