"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileSearch, RotateCcw, X } from "lucide-react";
import { SANDWICH_PRICE_VARIETY } from "@/app/assets/constants";
import {
  fromDateString,
  nextAvailableDates,
  toDateString,
} from "@/lib/delivery-dates";
import { cn } from "@/lib/utils";
import DeliveryDatePicker from "./DeliveryDatePicker";
import DrivingCar from "./DrivingCar";
import { CheckItem, QuantityStepper } from "./ui";

const dayLabel = (date, index) => {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (index === 0 && date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en-GB", { weekday: "long" });
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const shortDate = (date, withWeekday = false) =>
  `${withWeekday ? `${WEEKDAYS[date.getDay()]} ` : ""}${date.getDate()} ${MONTHS[date.getMonth()]}`;

function ChoiceCard({ primary, badge, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-1.5 rounded-[20px] px-[22px] py-5 text-left transition-transform duration-300 hover:-translate-y-0.5",
        primary ? "bg-plum text-cream" : "border-[1.5px] border-plum bg-cream text-ink"
      )}
    >
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
          primary ? "bg-sun text-ink" : "border border-plum/30 py-[3px] text-plum"
        )}
      >
        {badge}
      </span>
      <span className="mt-1 text-xl font-bold">{title}</span>
      <span className={cn("max-w-[75%] text-[13px]", primary ? "text-cream/85" : "text-taupe")}>
        {subtitle}
      </span>
      <span
        className={cn(
          "absolute bottom-[18px] right-[18px] flex h-10 w-10 items-center justify-center rounded-full",
          primary ? "bg-cream text-plum" : "bg-plum text-cream"
        )}
      >
        <ArrowRight className="h-[18px] w-[18px]" />
      </span>
    </button>
  );
}

export default function StartScreen({
  formData,
  updateFormData,
  disabledDates,
  onChoose,
  lastOrder,
  onReorder,
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const datesRef = useRef(null);
  const carRef = useRef(null);
  const leaving = useRef(false);

  // The car drives off before the next screen opens. Below the minimum the
  // page shows its validation message instead, so the car stays.
  const choose = async (type) => {
    if (leaving.current) return;
    if ((Number(formData.totalSandwiches) || 0) >= 20 && carRef.current) {
      leaving.current = true;
      await carRef.current.driveOff();
      leaving.current = false;
    }
    onChoose(type);
  };

  // The start screen has its own "powered by" line instead of the site footer.
  useEffect(() => {
    document.body.dataset.hideFooter = "true";
    return () => {
      delete document.body.dataset.hideFooter;
    };
  }, []);

  // Close the date picker on a click outside it or on Escape.
  useEffect(() => {
    if (!calendarOpen) return;
    const onPointerDown = (event) => {
      if (datesRef.current && !datesRef.current.contains(event.target)) setCalendarOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [calendarOpen]);
  const quickDates = useMemo(() => nextAvailableDates(4, disabledDates), [disabledDates]);
  const quickDateStrings = quickDates.map(toDateString);
  const pickedOtherDate =
    formData.deliveryDate && !quickDateStrings.includes(formData.deliveryDate)
      ? fromDateString(formData.deliveryDate)
      : null;

  const pickDate = (value) => {
    updateFormData("deliveryDate", value);
    // Same as the calendar: a new date means picking a new time.
    updateFormData("deliveryTime", "");
  };

  return (
    <div className="flex min-h-[calc(100vh-0px)] overflow-x-clip bg-cream">
      <div className="flex w-full flex-col lg:w-[54%] lg:shrink-0">
        <header className="flex h-24 items-center justify-between gap-4 px-4 md:h-28 md:px-14">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-sun px-4 py-1.5 text-[13px] font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-plum" aria-hidden />
              New design
              <span className="hidden font-normal sm:inline">· same easy ordering</span>
            </span>
          </div>
          <nav className="ml-auto flex items-center gap-2 text-sm font-medium md:gap-6 md:text-[15px]">
            <Link href="/quote/lookup" className="flex items-center gap-2 text-plum hover:text-ink lg:hidden">
              <FileSearch className="h-4 w-4" />
              Load quote
            </Link>
            {lastOrder && (
              <button
                type="button"
                onClick={onReorder}
                className="flex items-center gap-2 rounded-full border-[1.5px] border-plum px-4 py-2 font-semibold text-plum lg:hidden"
              >
                <RotateCcw className="h-4 w-4" />
                Order again
              </button>
            )}
          </nav>
          <Image
            src="/images/logo-catering.png"
            alt="The Sandwich Bar Catering"
            width={88}
            height={88}
            className="h-16 w-16 shrink-0 md:h-[88px] md:w-[88px]"
            priority
          />
        </header>

        <main className="flex flex-1 flex-col justify-center px-4 pb-10 md:px-14 md:pb-14">
          <div className="mx-auto flex w-full max-w-[668px] flex-col gap-5 lg:mx-0">
            <DrivingCar ref={carRef} radius={28}>
            <div className="flex flex-col gap-[22px] rounded-[24px] border border-plum/[0.14] bg-paper p-5 shadow-[0_24px_60px_-30px_rgba(56,38,40,0.35)] md:rounded-[28px] md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="totalSandwiches" className="text-[15px] font-semibold">
                    How many sandwiches?
                  </label>
                  <span className="text-[13px] text-taupe">
                    Type any amount or use − / + · minimum 20, we recommend 2 per person
                  </span>
                </div>
                <QuantityStepper
                  id="totalSandwiches"
                  label="sandwiches"
                  value={formData.totalSandwiches}
                  onChange={(value) => updateFormData("totalSandwiches", value)}
                  step={5}
                  min={20}
                  size="lg"
                />
              </div>

              <div className="h-px bg-plum/10" />

              <div ref={datesRef} className="relative flex flex-col gap-2.5">
                <span className="text-[15px] font-semibold">When?</span>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  {quickDates.map((date, index) => {
                    const value = quickDateStrings[index];
                    const active = formData.deliveryDate === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => pickDate(value)}
                        className={cn(
                          "flex h-[60px] flex-col items-center justify-center rounded-2xl border-[1.5px] sm:w-[112px]",
                          active ? "border-plum bg-plum text-cream" : "border-plum/20 bg-cream text-ink"
                        )}
                      >
                        <span className={cn("text-xs", active ? "opacity-80" : "text-taupe")}>
                          {dayLabel(date, index)}
                        </span>
                        <span className="text-[15px] font-semibold">{shortDate(date)}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((open) => !open)}
                    aria-expanded={calendarOpen}
                    aria-pressed={!!pickedOtherDate}
                    className={cn(
                      "col-span-2 flex h-[60px] flex-1 items-center justify-center gap-2 rounded-2xl border-[1.5px] text-sm font-medium",
                      pickedOtherDate
                        ? "border-plum bg-plum text-cream"
                        : "border-dashed border-plum/35 text-plum"
                    )}
                  >
                    <CalendarDays className="h-[18px] w-[18px]" />
                    {pickedOtherDate ? shortDate(pickedOtherDate, true) : "Other date"}
                  </button>
                </div>

                {calendarOpen && (
                  <div
                    role="dialog"
                    aria-label="Pick a delivery date"
                    className="absolute inset-x-0 top-full z-30 mt-2 flex flex-col gap-3 rounded-[24px] border border-plum/[0.14] bg-paper p-5 shadow-[0_24px_60px_-20px_rgba(56,38,40,0.45)] sm:left-auto sm:w-[380px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold">Pick a delivery date</span>
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setCalendarOpen(false)}
                        className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-taupe hover:bg-sand hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <DeliveryDatePicker
                      value={formData.deliveryDate}
                      disabledDates={disabledDates}
                      onChange={(value) => {
                        pickDate(value);
                        setCalendarOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ChoiceCard
                  primary
                  badge="Fastest"
                  title="Let us choose"
                  subtitle={`A varied mix · €${SANDWICH_PRICE_VARIETY.toFixed(2)} per sandwich`}
                  onClick={() => choose("variety")}
                />
                <ChoiceCard
                  badge="20+ sandwiches"
                  title="Build your own"
                  subtitle="Pick every sandwich from the menu"
                  onClick={() => choose("custom")}
                />
              </div>
            </div>
            </DrivingCar>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-taupe">
              <CheckItem>Free delivery above €150*</CheckItem>
              <CheckItem>Delivery 10:00 – 17:00</CheckItem>
              <CheckItem>Pay online or by invoice</CheckItem>
            </div>
            <p className="-mt-2 text-center text-xs text-taupe">*excluding certain postal codes</p>
          </div>
        </main>

        <footer className="px-4 pb-6 text-xs text-taupe md:px-14">
          Powered by{" "}
          <a
            href="https://squared-media.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-plum underline-offset-[3px] hover:underline"
          >
            Squared Media
          </a>
        </footer>
      </div>

      <div className="relative hidden flex-1 lg:block">
        <Image
          src="/images/hero-storefront.webp"
          alt="Walking past The Sandwich Bar storefront"
          fill
          priority
          sizes="46vw"
          className="object-cover object-[center_50%]"
        />
        <div className="absolute right-6 top-6 flex items-center gap-2 text-sm font-medium">
          <Link
            href="/quote/lookup"
            className="flex h-11 items-center gap-2 rounded-full bg-cream/90 px-4 text-plum hover:bg-cream"
          >
            <FileSearch className="h-4 w-4" />
            Load quote
          </Link>
          {lastOrder && (
            <button
              type="button"
              onClick={onReorder}
              className="flex h-11 items-center gap-2 rounded-full bg-plum px-[18px] font-semibold text-cream"
            >
              <RotateCcw className="h-4 w-4" />
              Order again
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
