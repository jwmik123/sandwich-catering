"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { trackPurchase } from "@/lib/gtm";
import { confirmPendingOrder } from "@/lib/last-order";
import { CATERING_PHONE, CATERING_PHONE_HREF } from "@/app/components/order/ui";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-plum">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cream" />
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const quoteId = searchParams.get("quoteId");
  const paymentType = searchParams.get("type");

  useEffect(() => {
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    // Guarded inside trackPurchase so it stays at one push per quoteId.
    trackPurchase(quoteId, paymentType);
    // Keep this order around for "Order again".
    confirmPendingOrder(quoteId);
  }, [quoteId, paymentType]);

  if (loading) return <Spinner />;

  return (
    <div className="flex min-h-screen flex-col bg-plum text-cream">
      <header className="flex h-20 items-center justify-between px-4 md:h-[88px] md:px-16">
        <Link href="/" aria-label="Back to the homepage">
          <Image
            src="/images/logo-catering.png"
            alt="The Sandwich Bar Catering"
            width={52}
            height={52}
            className="h-[52px] w-[52px] rounded-full shadow-[0_0_0_2px_rgba(253,244,229,0.4)]"
          />
        </Link>
        <span className="hidden text-sm text-cream/80 sm:block">
          Questions? orders@thesandwichbar.nl ·{" "}
          <a href={CATERING_PHONE_HREF} className="hover:text-cream">
            {CATERING_PHONE}
          </a>
        </span>
      </header>

      <main className="flex flex-1 items-center px-4 pb-16 md:px-16">
        <div className="flex max-w-3xl flex-col gap-6">
          <span className="flex items-center gap-2 self-start rounded-full bg-leaf-light px-3.5 py-1.5 text-[13px] font-semibold text-leaf">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            {paymentType === "invoice" ? "Order received" : "Thank you for your order"}
          </span>
          <div className="flex flex-col">
            <h1 className="m-0 text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.045em] md:text-[88px]">
              It&apos;s in
              <br />
              the planning.
            </h1>
            <span className="font-tomatoes text-6xl lowercase leading-[0.95] text-sun md:text-[104px]">
              enjoy your lunch!
            </span>
          </div>
          <p className="m-0 max-w-[560px] text-lg leading-relaxed text-cream/85">
            We have received your order and will process it. You will receive a confirmation by
            email.
          </p>
          {quoteId && (
            <p className="m-0 text-base text-cream/85">
              Quote ID: <strong className="text-cream">{quoteId}</strong>
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/"
              className="flex h-[52px] items-center rounded-full bg-cream px-6 text-[15px] font-semibold text-plum"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// Main component that wraps the SuccessContent with Suspense
export default function PaymentSuccess() {
  return (
    <Suspense fallback={<Spinner />}>
      <SuccessContent />
    </Suspense>
  );
}
