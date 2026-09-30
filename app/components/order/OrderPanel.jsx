"use client";
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { calculateVATBreakdown } from "@/lib/vat-calculations";
import { formatEuro } from "@/lib/selection-pricing";
import { formatLongDate } from "@/lib/delivery-dates";
import { ProgressBar } from "./ui";

export const FREE_DELIVERY_THRESHOLD = 150;

export function Totals({ totalAmount, deliveryCost, showDelivery = false, deliveryKnown = true, dark = false }) {
  const breakdown = calculateVATBreakdown(totalAmount, showDelivery ? deliveryCost || 0 : 0);
  const muted = dark ? "text-cream/80" : "text-taupe";
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className={`flex justify-between ${muted}`}>
        <span>Subtotal excl. VAT</span>
        <span className="tabular-nums">{formatEuro(totalAmount)}</span>
      </div>
      {showDelivery && (
        <div className={`flex justify-between ${muted}`}>
          <span>Delivery</span>
          <span className="tabular-nums">
            {!deliveryKnown ? "Enter postcode" : deliveryCost > 0 ? formatEuro(deliveryCost) : "Free"}
          </span>
        </div>
      )}
      <div className={`flex justify-between ${muted}`}>
        <span>VAT 9%</span>
        <span className="tabular-nums">{formatEuro(breakdown.vat)}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between text-xl font-bold">
        <span>Total</span>
        <span className="tabular-nums">{formatEuro(breakdown.total)}</span>
      </div>
    </div>
  );
}

export function FreeDeliveryMeter({ totalAmount }) {
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - totalAmount);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[13px]">
        <span className="text-taupe">
          {remaining > 0
            ? `${formatEuro(remaining)} to go for free delivery`
            : "You qualify for free delivery*"}
        </span>
      </div>
      <ProgressBar
        value={(totalAmount / FREE_DELIVERY_THRESHOLD) * 100}
        className="h-1.5"
        barClassName="bg-[#C98B4E]"
      />
    </div>
  );
}

export function DeliveryDateNote({ formData }) {
  if (!formData.deliveryDate) return null;
  return (
    <span className="text-[13px] text-taupe">
      {formatLongDate(formData.deliveryDate)}
      {formData.deliveryTime ? ` · ${formData.deliveryTime}` : ""}
    </span>
  );
}

/**
 * Desktop: a sticky card next to the content. Mobile: a bar pinned to the
 * bottom of the screen that opens the same content as a sheet.
 */
export default function OrderPanel({ children, barSummary, barTotal }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <aside className="hidden w-[400px] shrink-0 lg:block">
        <div className="sticky top-[108px] flex flex-col gap-5 rounded-[28px] border border-plum/[0.14] bg-paper p-[26px] shadow-[0_30px_60px_-40px_rgba(56,38,40,0.5)]">
          {children}
        </div>
      </aside>

      <div className="fixed inset-x-3 bottom-4 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-[68px] w-full items-center gap-3 rounded-[22px] bg-plum pl-[18px] pr-2.5 text-left text-cream shadow-[0_20px_40px_-16px_rgba(56,38,40,0.6)]"
        >
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="text-[13px]">
              {barSummary} · <span className="tabular-nums">{barTotal}</span>
            </span>
          </span>
          <span className="flex h-12 items-center rounded-full bg-cream px-4 text-sm font-semibold text-plum">
            View order
          </span>
        </button>
      </div>
      <div className="h-24 lg:hidden" aria-hidden />

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden" role="dialog" aria-modal="true" aria-label="Your order">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-ink/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex max-h-[88vh] flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-cream px-4 pb-6 pt-3">
            <div className="flex items-center justify-between">
              <span className="mx-auto h-[5px] w-11 rounded-full bg-plum/25" />
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-taupe"
            >
              <X className="h-5 w-5" />
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
