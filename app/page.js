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
import { toast, ToastContainer } from "react-toastify";
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
import { Button } from "@/components/ui/button";
import MenuCategories from "@/app/components/MenuCategories";
import { breadTypes } from "@/app/assets/constants";
import VarietySelector from "@/app/components/VarietySelector";
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import DeliveryCalendar from "@/app/components/DeliveryCalendar";
import QuoteButton from "@/app/components/QuoteButton";

const Home = () => {
  const [sandwichOptions, setSandwichOptions] = useState([]);
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
            numberOfPeople: quote.orderDetails.numberOfPeople,

            // Step 2
            sandwichesPerPerson: quote.orderDetails.sandwichesPerPerson,
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

          // Show success message
          toast({
            title: "Offerte geladen",
            description:
              "De offerte is succesvol geladen. U kunt nu wijzigingen aanbrengen en opnieuw bestellen.",
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        } catch (error) {
          console.error("Error restoring quote:", error);
          toast({
            title: "Fout bij laden",
            description: "Er is iets misgegaan bij het laden van de offerte.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      }
    }
  }, []);

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    // Stap 1
    numberOfPeople: "",
    // Stap 2
    sandwichesPerPerson: 2,
    totalSandwiches: 0,
    // Stap 3
    selectionType: "",

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
        return formData.numberOfPeople > 0;
      case 2:
        return formData.totalSandwiches >= 15; // Minimum order requirement
      case 3:
        if (formData.selectionType === "custom") {
          const totalSelected = Object.values(formData.customSelection)
            .flat()
            .reduce((total, selection) => total + selection.quantity, 0);
          return totalSelected === formData.totalSandwiches;
        }
        return (
          formData.selectionType === "variety" &&
          formData.varietySelection.vega +
            formData.varietySelection.nonVega +
            formData.varietySelection.vegan ===
            formData.totalSandwiches
        );
      case 4:
        return true; // Overview step is always valid
      case 6:
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
      case 3:
        if (formData.selectionType === "custom") {
          const totalSelected = Object.values(formData.customSelection)
            .flat()
            .reduce((total, selection) => total + selection.quantity, 0);
          const remaining = formData.totalSandwiches - totalSelected;
          if (remaining > 0) {
            return `U moet nog ${remaining} broodje${
              remaining === 1 ? "" : "s"
            } selecteren`;
          }
          if (remaining < 0) {
            return `U heeft ${Math.abs(remaining)} broodje${
              Math.abs(remaining) === 1 ? "" : "s"
            } te veel geselecteerd`;
          }
        }
        if (formData.selectionType === "variety") {
          const total =
            formData.varietySelection.vega +
            formData.varietySelection.nonVega +
            formData.varietySelection.vegan;
          if (total !== formData.totalSandwiches) {
            return `De verdeling moet in totaal ${formData.totalSandwiches} broodjes zijn`;
          }
        }
        return "";
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
      return formData.totalSandwiches * 5.5; // Assuming €5.5 per sandwich + 9% VAT
    }
  };
  const totalAmount = calculateTotal(formData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // First generate the quote
      const result = await generateQuote(formData);

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
              amount: totalAmount,
              orderDetails: formData,
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
              amount: totalAmount,
              orderDetails: formData,
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

      // Automatische berekeningen
      if (field === "numberOfPeople" || field === "sandwichesPerPerson") {
        newData.totalSandwiches =
          Number(newData.numberOfPeople) * Number(newData.sandwichesPerPerson);
      }

      return newData;
    });
  };

  const renderCombinedSteps = () => (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <Users className="w-5 h-5" />
        <h2>Aantal Personen & Broodjes</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-row w-full md:w-1/2">
          {/* Number of People section */}
          <div className="w-full">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full mb-4">
                <Label htmlFor="peopleSelect">
                  Voor hoeveel personen is de lunch catering?
                </Label>
                <Select
                  value={formData.numberOfPeople.toString()}
                  onValueChange={(value) =>
                    updateFormData("numberOfPeople", value)
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Selecteer aantal personen" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 50, 100].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} personen
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full mb-8">
                <Label htmlFor="peopleInput">
                  Of voer een specifiek aantal in:
                </Label>
                <Input
                  id="peopleInput"
                  type="number"
                  min="1"
                  value={formData.numberOfPeople}
                  onChange={(e) =>
                    updateFormData("numberOfPeople", e.target.value)
                  }
                  className="mt-1"
                  placeholder="Voer aantal personen in"
                />
              </div>
            </div>

            <div className="w-full">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() =>
                        updateFormData(
                          "sandwichesPerPerson",
                          Math.max(1, formData.sandwichesPerPerson - 0.5)
                        )
                      }
                      variant="outline"
                      className={secondaryButtonClasses}
                    >
                      -
                    </Button>
                    <span className="text-lg font-medium">
                      {formData.sandwichesPerPerson} broodjes per persoon
                    </span>
                    <Button
                      onClick={() =>
                        updateFormData(
                          "sandwichesPerPerson",
                          formData.sandwichesPerPerson + 0.5
                        )
                      }
                      variant="outline"
                      className={secondaryButtonClasses}
                    >
                      +
                    </Button>
                  </div>

                  <div className="bg-beige-50 p-4 rounded-md text-sm text-green-500 bg-green-50">
                    <p>* Wij adviseren 2 broodjes per persoon</p>
                    <p>* Minimaal 15 broodjes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-6 rounded-lg w-full md:w-1/2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Samenvatting
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Aantal personen</p>
              <p className="text-lg font-medium">{formData.numberOfPeople}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Broodjes per persoon</p>
              <p className="text-lg font-medium">
                {formData.sandwichesPerPerson}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Totaal aantal broodjes</p>
              <p className="text-lg font-medium">{formData.totalSandwiches}</p>
              {formData.totalSandwiches < 15 &&
                formData.totalSandwiches > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    * Minimaal aantal broodjes is 15
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
          <h2>Kies uw Aanbod</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`p-6 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.selectionType === "custom"
                ? "border-black bg-beige-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => updateFormData("selectionType", "custom")}
          >
            <h3 className="text-lg font-medium mb-2">Zelf Samenstellen</h3>
            <p className="text-sm text-gray-600">
              Kies zelf de broodjes die u wilt bestellen
            </p>
          </div>

          <div
            className={`p-6 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.selectionType === "variety"
                ? "border-black bg-beige-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => updateFormData("selectionType", "variety")}
          >
            <h3 className="text-lg font-medium mb-2">Gevarieerd Aanbod</h3>
            <p className="text-sm text-gray-600">
              Kies de verdeling tussen verschillende types broodjes
            </p>
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
                  <p className="text-sm text-gray-500">Geselecteerde items</p>
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
                  <p className="text-sm text-gray-500">Totaalbedrag</p>
                  <p className="text-lg font-medium">
                    €
                    {Object.values(formData.customSelection)
                      .flat()
                      .reduce(
                        (total, selection) => total + selection.subTotal,
                        0
                      )
                      .toFixed(2)}{" "}
                    excl. BTW
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.selectionType === "variety" && (
          <div className="space-y-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900">
              Kies een verdeling
            </h3>
            <VarietySelector
              totalSandwiches={formData.totalSandwiches}
              formData={formData}
              updateFormData={updateFormData}
            />
          </div>
        )}
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <FileText className="w-5 h-5" />
        <h2>Besteloverzicht</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Aantal personen</p>
              <p className="text-lg font-medium">{formData.numberOfPeople}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Broodjes per persoon</p>
              <p className="text-lg font-medium">
                {formData.sandwichesPerPerson}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Totaal aantal broodjes</p>
              <p className="text-lg font-medium">{formData.totalSandwiches}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type bestelling</p>
              <p className="text-lg font-medium">
                {formData.selectionType === "custom"
                  ? "Zelf samengesteld"
                  : "Gevarieerd aanbod"}
              </p>
            </div>
          </div>

          {formData.selectionType === "custom" ? (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">
                Geselecteerde broodjes
              </p>
              <div className="space-y-4">
                {Object.entries(formData.customSelection)
                  .filter(([_, selections]) => selections?.length > 0)
                  .map(([id, selections]) => {
                    const sandwich = sandwichOptions.find((s) => s._id === id);
                    return (
                      <div key={id} className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {sandwich.name}
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
                  <span>Totaalbedrag</span>
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
                  <span>Totaal aantal</span>
                  <span>
                    {Object.values(formData.customSelection)
                      .flat()
                      .reduce(
                        (total, selection) => total + selection.quantity,
                        0
                      )}{" "}
                    / {formData.totalSandwiches} broodjes
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">Verdeling broodjes</p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Kip, Vlees, Vis</span>
                  <span>{formData.varietySelection.nonVega} broodjes</span>
                </div>
                <div className="flex justify-between">
                  <span>Vegetarisch</span>
                  <span>{formData.varietySelection.vega} broodjes</span>
                </div>
                <div className="flex justify-between">
                  <span>Vegan</span>
                  <span>{formData.varietySelection.vegan} broodjes</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between font-medium">
                    <span>Totaal</span>
                    <span>{formData.totalSandwiches} broodjes</span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
          Wijzig bestelling
        </button>
      </div>
    </div>
  );

  const [date, setDate] = useState(null);

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
          <Label htmlFor="street">Straat</Label>
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
            <Label htmlFor="houseNumber">Huisnummer</Label>
            <Input
              id="houseNumber"
              type="text"
              value={formData.houseNumber}
              onChange={(e) => updateFormData("houseNumber", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="houseNumberAddition">Toevoeging</Label>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Plaats</Label>
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
        <h2>Contact- en Bedrijfsgegevens</h2>
      </div>

      <div className="space-y-4">
        {/* Contact Details */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-700">Contactgegevens</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              E-mailadres*
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              required
              placeholder="uw@email.nl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Telefoonnummer*
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => updateFormData("phoneNumber", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              placeholder="06 12345678"
            />
          </div>
        </div>

        {/* Company Details Section */}
        <div className="pt-6 border-t">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCompany"
              checked={formData.isCompany}
              onChange={(e) => updateFormData("isCompany", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isCompany"
              className="text-sm font-medium text-gray-700"
            >
              Dit is een zakelijke bestelling
            </label>
          </div>

          {formData.isCompany && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bedrijfsnaam
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    updateFormData("companyName", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  BTW-nummer
                </label>
                <input
                  type="text"
                  value={formData.companyVAT}
                  onChange={(e) => updateFormData("companyVAT", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
        <h2>Betaling</h2>
      </div>

      {/* Price Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subtotaal:</span>
            <span className="font-medium">€{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">BTW (9%):</span>
            <span className="font-medium">
              €{(totalAmount * 0.09).toFixed(2)}
            </span>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Totaal:</span>
              <span className="text-lg font-bold">
                €{(totalAmount * 1.09).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selection - Only show for companies */}
      {formData.isCompany && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Kies uw betaalmethode:</p>

          <div className="space-y-3">
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === "online"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => setPaymentMethod("online")}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={paymentMethod === "online"}
                  onChange={() => setPaymentMethod("online")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium">Direct online betalen</p>
                  <p className="text-sm text-gray-500">
                    iDEAL, creditcard, etc.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === "invoice"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
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
                  <p className="font-medium">Betalen via factuur</p>
                  <p className="text-sm text-gray-500">
                    Binnen 14 dagen na factuurdatum
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
        className={`w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium 
          hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:ring-offset-2 transition-colors 
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center justify-center gap-2">
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
              <span>Bezig met verwerken...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>
                {paymentMethod === "invoice"
                  ? "Bestelling plaatsen"
                  : "Doorgaan naar betalen"}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );

  const steps = [
    { icon: Users, title: "Bestelling" },
    { icon: Utensils, title: "Aanbod" },
    { icon: FileText, title: "Overzicht" },
    { icon: Calendar, title: "Bezorging" },
    { icon: Building2, title: "Bedrijfsgegevens" },
    { icon: CreditCard, title: "Betaling" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="container mx-auto p-4">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className={`${secondaryButtonClasses} flex items-center gap-2`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Vorige
                </button>
              )}

              {/* Progress Text */}
              <div className="text-sm font-medium text-gray-500">
                Stap {currentStep} van {steps.length}
              </div>

              {/* Next Button */}
              {currentStep < steps.length && (
                <div className="flex flex-col items-end gap-2">
                  {getValidationMessage(currentStep) && (
                    <p className="text-sm text-red-600">
                      {getValidationMessage(currentStep)}
                    </p>
                  )}
                  <button
                    onClick={() => setCurrentStep((prev) => prev + 1)}
                    className={`${primaryButtonClasses} flex items-center gap-2 ${
                      !isStepValid(currentStep)
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={!isStepValid(currentStep)}
                  >
                    {currentStep === steps.length - 1 ? "Afronden" : "Volgende"}
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
                  <span className="text-xs mt-1">{step.title}</span>
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            {currentStep === 1 && renderCombinedSteps()}
            {currentStep === 2 && renderStep3()}
            {currentStep === 3 && renderStep4()}
            {currentStep === 4 && renderStep5()}
            {currentStep === 5 && renderStep6()}
            {currentStep === 6 && renderStep7()}
          </div>

          {/* Quote Lookup Link */}
          <div className="mt-6 flex">
            <Link
              href="/quote/lookup"
              className="text-white bg-black px-4 py-2 rounded-md flex items-center gap-2"
            >
              <FileSearch className="w-4 h-4" />
              Offerte ophalen
            </Link>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Home;
