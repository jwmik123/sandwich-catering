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
            addDrinks: formData.addDrinks || false,
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
      </div>
    </div>
  );
};

export default ContactStep; 