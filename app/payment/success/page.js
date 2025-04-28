"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const quoteId = searchParams.get("quoteId");
  const formData = searchParams.get("formData");
  const commonButtonClasses =
    "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const secondaryButtonClasses = `${commonButtonClasses} bg-muted text-muted-foreground hover:bg-muted/90 focus:ring-muted`;

  useEffect(() => {
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg font-medium text-muted-foreground">
          <CheckCircle className="w-5 h-5" />
          <h2>Confirmation</h2>
        </div>

        <div className="space-y-6">
          <div className="bg-accent border border-accent rounded-lg p-6">
            <h3 className="text-lg font-medium text-accent-foreground mb-2">
              Thank you for your order!
            </h3>
            <p className="text-accent-foreground">
              We have received your order and will process it.
            </p>
            <p className="text-accent-foreground mt-6">
              You will receive a confirmation by email.
            </p>
          </div>

          <div className="bg-muted rounded-lg p-6 space-y-4">
            <div className="flex space-x-4 items-center">
              <p className="text-sm text-muted-foreground">Quote ID:</p>
              <p className="font-medium">{quoteId}</p>
            </div>
          </div>
          <div className="border-t pt-4 mt-4">
            <Link href="/">
              <Button>Back to homepage</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the SuccessContent with Suspense
export default function PaymentSuccess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
