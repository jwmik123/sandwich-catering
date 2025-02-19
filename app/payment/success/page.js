"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import QuoteButton from "@/app/components/QuoteButton";
import { Suspense } from "react";
export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const quoteId = searchParams.get("quoteId");
  const formData = searchParams.get("formData");
  const commonButtonClasses =
    "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const secondaryButtonClasses = `${commonButtonClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500`;

  useEffect(() => {
    // Here you could verify the payment status with Mollie
    // For now, we'll just show success
    setLoading(false);
  }, [quoteId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
            <CheckCircle className="w-5 h-5" />
            <h2>Bevestiging</h2>
          </div>

          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-800 mb-2">
                Bedankt voor uw bestelling!
              </h3>
              <p className="text-green-700">
                We hebben uw bestelling ontvangen en zullen deze verwerken.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-medium text-gray-900">Besteloverzicht</h3>
              <div>
                <p className="text-sm text-gray-500">Referentienummer</p>
                <p className="font-medium">{quoteId}</p>
              </div>

              <div className="border-t pt-4 mt-4">
                <QuoteButton
                  formData={formData}
                  buttonClasses={secondaryButtonClasses}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
