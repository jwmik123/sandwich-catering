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

  // Add useEffect to handle scrolling to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

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

        // Validate phone number (just check if not empty)
        const isPhoneValid = formData.phoneNumber.trim() !== "";

        // Base validation
        let isValid =
          isEmailValid && isPhoneValid && formData.name.trim() !== "";

        // Additional company validation if isCompany is checked
        if (!formData.isCompany) {
          isValid = isValid && formData.companyName.trim() !== "";
        }

        return isValid;
      default:
        return true;
    }
  };

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

  const totalAmount = calculateTotal(formData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");

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

  const handleDownloadInvoice = async () => {
    try {
      // Calculate total amount including delivery costs
      let totalAmount = 0;
      if (formData.selectionType === "custom") {
        totalAmount = Object.values(formData.customSelection)
          .flat()
          .reduce((total, selection) => total + selection.subTotal, 0);
      } else {
        totalAmount = formData.totalSandwiches * 6.38;
      }

      // Add delivery cost if present
      const finalAmount = totalAmount + (deliveryCost || 0);

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
          companyDetails: {
            isCompany: formData.isCompany,
            name: formData.companyName,
            vatNumber: formData.companyVAT,
            address: {
              street: formData.street,
              houseNumber: formData.houseNumber,
              houseNumberAddition: formData.houseNumberAddition,
              postalCode: formData.postalCode,
              city: formData.city,
            },
          },
          amount: finalAmount, // Use total including delivery
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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

  const commonButtonClasses =
    "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryButtonClasses = `${commonButtonClasses} bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`;
  const secondaryButtonClasses = `${commonButtonClasses} bg-muted text-muted-foreground hover:bg-muted/90 focus:ring-muted`;

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

  const renderCombinedSteps = () => (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex items-center gap-2 text-lg font-medium text-custom-gray">
        <Users className="w-5 h-5" />
        <h2 className="text-gray-700">Amount of sandwiches</h2>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-row w-full md:w-1/2">
          {/* Number of People section */}
          <div className="w-full">
            <div className="flex flex-col gap-4 md:flex-row">
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
                <div className="p-4 text-sm text-green-500 rounded-md bg-beige-50 bg-green-50">
                  <p>* We recommend 2 sandwiches per person</p>
                  <p>* Minimum 15 sandwiches</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full p-6 rounded-lg bg-custom-gray/10 md:w-1/2">
          <h3 className="mb-4 text-lg font-medium text-custom-gray">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-sm text-custom-gray">
                Total number of sandwiches
              </p>
              <p className="text-lg font-medium">{formData.totalSandwiches}</p>
              {formData.totalSandwiches < 15 &&
                formData.totalSandwiches > 0 && (
                  <p className="mt-1 text-sm text-red-600">
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
        <div className="flex items-center gap-2 text-lg font-medium text-custom-gray">
          <Utensils className="w-5 h-5" />
          <h2 className="text-gray-700">Choose your Selection</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.selectionType === "custom"
                ? "border-black bg-beige-50"
                : "border-custom-gray/20 hover:border-custom-gray/30"
            }`}
            onClick={() => updateFormData("selectionType", "custom")}
          >
            <h3 className="mb-2 text-lg font-medium">
              Create your own selection
            </h3>
            <p className="text-sm text-custom-gray">Choose your sandwiches</p>
          </div>

          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.selectionType === "variety"
                ? "border-black bg-beige-50"
                : "border-custom-gray/20 hover:border-custom-gray/30"
            }`}
            onClick={() => updateFormData("selectionType", "variety")}
          >
            <h3 className="mb-2 text-lg font-medium">Variety Offer</h3>
            <p className="text-sm text-custom-gray">Let us surprise you! :)</p>
          </div>
        </div>

        {formData.selectionType === "custom" && (
          <div className="mt-6">
            <MenuCategories
              sandwichOptions={sandwichOptions}
              formData={formData}
              updateFormData={updateFormData}
            />

            <div className="p-4 mt-6 rounded-lg bg-custom-gray/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-custom-gray">Selected items</p>
                  <p className="text-lg font-medium">
                    {Object.values(formData.customSelection)
                      .flat()
                      .reduce(
                        (total, selection) => total + selection.quantity,
                        0
                      )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-custom-gray">Total amount</p>
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
            <div className="mt-6 space-y-6">
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
        <h2 className="text-gray-700">Order summary</h2>
      </div>

      <div className="space-y-4">
        <div className="p-6 space-y-4 rounded-lg bg-custom-gray/10">
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
            <div className="pt-4 mt-4 border-t">
              <p className="mb-2 text-sm text-gray-500">Selected sandwiches</p>
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
                              className="flex justify-between pl-4 text-sm"
                            >
                              <span className="text-gray-600">
                                {selection.quantity}x - {breadType}
                                {selection.sauce !== "geen" &&
                                  ` with ${selection.sauce}`}
                              </span>
                              <span className="font-medium text-gray-900">
                                €{selection.subTotal.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
              <div className="pt-4 mt-4 border-t">
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
                <div className="flex justify-between mt-1 text-sm text-gray-500">
                  <span>Total number of sandwiches</span>
                  <span>{formData.totalSandwiches} sandwiches</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-4 mt-4 border-t">
              <p className="mb-2 text-sm text-gray-500">
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
              <div className="pt-4 mt-4 border-t">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total amount</span>
                  <span>€{(formData.totalSandwiches * 6.38).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm text-gray-500">
                  <span>Total number of sandwiches</span>
                  <span>{formData.totalSandwiches} sandwiches</span>
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
        <div className="flex gap-2">
          <div className="w-full pt-4 mt-4 ">
            <QuoteButton
              formData={formData}
              sandwichOptions={sandwichOptions}
              buttonClasses={secondaryButtonClasses}
            />
          </div>
          <div className="w-full pt-4 mt-4 ">
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full px-2 py-2 font-medium text-gray-700 rounded-md bg-custom-gray/10 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Update order
            </button>
          </div>
        </div>
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

      <div className="space-y-6">
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-700">
            Delivery Address
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  onChange={(e) =>
                    updateFormData("houseNumber", e.target.value)
                  }
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <p className="mt-1 text-sm text-red-500">{deliveryError}</p>
              )}
              {deliveryCost === 0 && (
                <p className="mt-1 text-sm text-green-500">Free delivery!</p>
              )}
              {deliveryCost > 0 && (
                <p className="mt-1 text-sm text-gray-600">
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
        </div>

        <div className="pt-6 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id="sameAsDelivery"
              checked={formData.sameAsDelivery}
              onCheckedChange={(checked) => {
                updateFormData("sameAsDelivery", checked);
                if (checked) {
                  // Copy delivery address to invoice address
                  updateFormData("invoiceStreet", formData.street);
                  updateFormData("invoiceHouseNumber", formData.houseNumber);
                  updateFormData(
                    "invoiceHouseNumberAddition",
                    formData.houseNumberAddition
                  );
                  updateFormData("invoicePostalCode", formData.postalCode);
                  updateFormData("invoiceCity", formData.city);
                }
              }}
            />
            <Label
              htmlFor="sameAsDelivery"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Invoice and delivery address are the same
            </Label>
          </div>

          {!formData.sameAsDelivery && (
            <div className="mt-6 space-y-6">
              <h3 className="text-lg font-medium text-gray-700">
                Invoice Address
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoiceStreet">Street</Label>
                  <Input
                    id="invoiceStreet"
                    type="text"
                    value={formData.invoiceStreet}
                    onChange={(e) =>
                      updateFormData("invoiceStreet", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceHouseNumber">House number</Label>
                    <Input
                      id="invoiceHouseNumber"
                      type="text"
                      value={formData.invoiceHouseNumber}
                      onChange={(e) =>
                        updateFormData("invoiceHouseNumber", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceHouseNumberAddition">Addition</Label>
                    <Input
                      id="invoiceHouseNumberAddition"
                      type="text"
                      value={formData.invoiceHouseNumberAddition}
                      onChange={(e) =>
                        updateFormData(
                          "invoiceHouseNumberAddition",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoicePostalCode">Postcode</Label>
                  <Input
                    id="invoicePostalCode"
                    type="text"
                    value={formData.invoicePostalCode}
                    onChange={(e) =>
                      updateFormData("invoicePostalCode", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceCity">City</Label>
                  <Input
                    id="invoiceCity"
                    type="text"
                    value={formData.invoiceCity}
                    onChange={(e) =>
                      updateFormData("invoiceCity", e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <Building2 className="w-5 h-5" />
        <h2 className="text-gray-700">Contact and Company details</h2>
      </div>

      <div className="space-y-4">
        {/* Contact Details */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 text-md">Contact details</h3>

          <div className="space-y-2">
            <Label htmlFor="name">Full name*</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

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
              This is NOT a business order
            </Label>
          </div>

          {!formData.isCompany && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name*</Label>
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

              {/* Download Invoice Button */}
              <div className="pt-4">
                <button
                  onClick={handleDownloadInvoice}
                  className="w-full px-4 py-2 text-sm font-medium text-white transition-colors rounded-md bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Download Invoice Preview
                </button>
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
        <h2 className="text-gray-700">Payment</h2>
      </div>

      <div className="p-6 border border-gray-200 rounded-lg bg-custom-gray/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">€{totalAmount.toFixed(2)}</span>
          </div>
          {deliveryCost !== null ? (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Delivery:</span>
              <span className="font-medium">
                {deliveryCost === 0 ? "Free" : `€${deliveryCost.toFixed(2)}`}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Delivery:</span>
              <span className="font-medium text-green-600">Free</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">VAT (9%):</span>
            <span className="font-medium">
              €{((totalAmount + (deliveryCost || 0)) * 0.09).toFixed(2)}
            </span>
          </div>
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold">
                €{((totalAmount + (deliveryCost || 0)) * 1.09).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {deliveryError && (
          <div className="p-3 mt-4 border rounded-md bg-accent border-accent">
            <p className="text-sm text-accent-foreground">{deliveryError}</p>
          </div>
        )}
      </div>

      {/* Payment Method Selection - Only show for business orders */}
      {!formData.isCompany && (
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
                {formData.isCompany || paymentMethod === "online"
                  ? "Continue to payment"
                  : "Place order"}
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
    <div className="min-h-[70vh] bg-background">
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="flex items-center justify-center p-2 space-x-2 text-sm text-center bg-green-500 text-accent-foreground">
          <span className="font-bold">
            Free delivery for orders above €100,-{" "}
          </span>
        </div>
        <div className="container px-4 py-1 mx-auto">
          <div className="flex items-center justify-between">
            <Image
              src={"/tsb-logo-full.png"}
              alt="The Sandwich Bar Nassaukade B.V. Logo"
              className="w-16 md:w-20"
              width={250}
              height={250}
            />
            {/* Back Button */}
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className={`${secondaryButtonClasses} flex items-center gap-1`}
              >
                <ChevronLeft className="w-4 h-4" />
                Go back
              </button>
            )}

            {/* Progress Text */}
            <div className="hidden text-sm font-medium text-gray-500 md:block">
              Step {currentStep} of {steps.length}
            </div>

            {/* Next Button */}
            {currentStep < steps.length && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    const validationMessage = getValidationMessage(currentStep);
                    if (!isStepValid(currentStep) && validationMessage) {
                      toast.error(validationMessage);
                    } else if (isStepValid(currentStep)) {
                      setCurrentStep((prev) => prev + 1);
                    }
                  }}
                  className={`${primaryButtonClasses} !bg-green-500 flex items-center gap-1 ${
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
      <div className="container px-4 py-4 mx-auto">
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
                <div className="flex items-center justify-center w-8 h-8 border-2 border-current rounded-full bg-background">
                  <StepIcon className="w-4 h-4" />
                </div>
                <span className="hidden mt-1 text-xs md:block">
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-full transition-all duration-300 rounded-full bg-primary"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-8 mx-auto md:px-4 md:container">
        <div className="p-6 rounded-lg shadow-md bg-background">
          {currentStep === 1 && renderCombinedSteps()}
          {currentStep === 2 && renderStep3()}
          {currentStep === 3 && renderStep4()}
          {currentStep === 4 && renderStep5()}
          {currentStep === 5 && renderStep6()}
          {currentStep === 6 && renderStep7()}
        </div>

        {/* Quote Lookup Link */}
        <div className="flex items-center justify-between mt-6">
          <Link
            href="/quote/lookup"
            className="flex items-center gap-2 px-4 py-2 text-gray-400 rounded-md"
          >
            <FileSearch className="w-4 h-4" />
            Load quote
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
