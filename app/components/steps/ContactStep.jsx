"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-toastify";

const ContactStep = ({
  formData,
  updateFormData,
  sandwichOptions,
  deliveryCost,
  // totalAmount,
}) => {
  // Email validation helper
  const validateEmailFormat = (emailString) => {
    if (!emailString || emailString.trim() === "") return { isValid: false, message: "" };
    
    const emails = emailString.split(',').map(email => email.trim()).filter(email => email !== "");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return { 
        isValid: false, 
        message: `Invalid email format: ${invalidEmails.join(', ')}` 
      };
    }
    
    return { 
      isValid: true, 
      message: emails.length > 1 ? `${emails.length} email addresses will receive notifications` : "" 
    };
  };

  const emailValidation = validateEmailFormat(formData.email);
  const handleDownloadInvoice = async () => {
    try {
      // Calculate total amount including delivery costs
      let calculatedAmount = 0;
      if (formData.selectionType === "custom") {
        calculatedAmount = Object.values(formData.customSelection)
          .flat()
          .reduce((total, selection) => total + selection.subTotal, 0);
      } else {
        calculatedAmount = formData.totalSandwiches * 6.83;

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

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center text-lg font-medium text-gray-700">
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
              type="text"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              placeholder="your@email.com, additional@email.com"
              required
              className={
                formData.email && !emailValidation.isValid 
                  ? "border-red-500" 
                  : formData.email && emailValidation.isValid && emailValidation.message
                  ? "border-green-500"
                  : ""
              }
            />
            <div className="text-sm">
              <p className="text-gray-500">
                You can add multiple email addresses separated by commas. All emails will receive order confirmations and invoices.
              </p>
              {formData.email && emailValidation.message && (
                <p className={emailValidation.isValid ? "text-green-600" : "text-red-600"}>
                  {emailValidation.message}
                </p>
              )}
            </div>
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

        {/* How did you find us Section */}
        

        {/* Company Details Section */}
        <div className="pt-6 border-t">
          <div className="flex gap-2 items-center">
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

              <div className="space-y-2">
                <Label htmlFor="referenceNumber">
                  Reference number (optional)
                </Label>
                <Input
                  id="referenceNumber"
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) =>
                    updateFormData("referenceNumber", e.target.value)
                  }
                  placeholder="Your internal reference number"
                />
              </div>

              {/* Download Invoice Button */}
              <div className="pt-4">
                <button
                  onClick={handleDownloadInvoice}
                  className="px-4 py-2 w-full text-sm font-medium text-white rounded-md transition-colors bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Download Invoice Preview
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="pt-6 border-t">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700 text-md">How did you find us? (optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: "google", label: "Google search" },
                { value: "social_media", label: "Social media" },
                { value: "recommendation", label: "Recommendation from friend/colleague" },
                { value: "website", label: "Company website" },
                { value: "advertisement", label: "Advertisement" },
                { value: "repeat_customer", label: "Repeat customer" }
              ].map((option) => (
                <div key={option.value} className="flex gap-2 items-center">
                  <Checkbox
                    id={`findUs-${option.value}`}
                    checked={formData.howDidYouFindUs?.includes(option.value) || false}
                    onCheckedChange={(checked) => {
                      const currentSelection = formData.howDidYouFindUs || [];
                      if (checked) {
                        updateFormData("howDidYouFindUs", [...currentSelection, option.value]);
                      } else {
                        updateFormData("howDidYouFindUs", currentSelection.filter(item => item !== option.value));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`findUs-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Other option with text input */}
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Checkbox
                  id="findUs-other"
                  checked={formData.howDidYouFindUs?.includes("other") || false}
                  onCheckedChange={(checked) => {
                    const currentSelection = formData.howDidYouFindUs || [];
                    if (checked) {
                      updateFormData("howDidYouFindUs", [...currentSelection, "other"]);
                    } else {
                      updateFormData("howDidYouFindUs", currentSelection.filter(item => item !== "other"));
                      updateFormData("howDidYouFindUsOther", ""); // Clear the text input
                    }
                  }}
                />
                <Label
                  htmlFor="findUs-other"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Other
                </Label>
              </div>
              
              {formData.howDidYouFindUs?.includes("other") && (
                <Input
                  type="text"
                  value={formData.howDidYouFindUsOther || ""}
                  onChange={(e) => updateFormData("howDidYouFindUsOther", e.target.value)}
                  placeholder="Please specify..."
                  className="ml-6"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactStep; 