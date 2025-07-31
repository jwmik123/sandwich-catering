"use client";
import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { generateQuote } from "@/app/actions/generateQuote";

const PaymentStep = ({
  formData,
  // updateFormData,
  totalAmount,
  deliveryCost,
  deliveryError,
}) => {
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

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center text-lg font-medium text-gray-700">
        <CreditCard className="w-5 h-5" />
        <h2 className="text-gray-700">Payment</h2>
      </div>

      <div className="p-6 rounded-lg border border-gray-200 bg-custom-gray/10">
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
              €
              {Math.ceil((totalAmount + (deliveryCost || 0)) * 0.09 * 100) /
                100}
            </span>
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold">
                €{((totalAmount + (deliveryCost || 0)) * 1.09).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {deliveryError && (
          <div className="p-3 mt-4 rounded-md border bg-accent border-accent">
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
              <div className="flex gap-3 items-center">
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
              <div className="flex gap-3 items-center">
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
        <div className="flex gap-2 justify-center items-center">
          {isProcessing ? (
            <>
              <div className="w-5 h-5 rounded-full border-t-2 border-white animate-spin" />
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
};

export default PaymentStep; 