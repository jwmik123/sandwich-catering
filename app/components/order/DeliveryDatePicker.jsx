"use client";
import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  fromDateString,
  isDateDisabled,
  nextAvailableDates,
  toDateString,
} from "@/lib/delivery-dates";

export default function DeliveryDatePicker({ value, onChange, disabledDates = [] }) {
  const selected = fromDateString(value);
  // Open on the selected date, or else on the first date we can deliver.
  const [month, setMonth] = useState(
    () => selected || nextAvailableDates(1, disabledDates)[0] || new Date()
  );

  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={(date) => date && onChange(toDateString(date))}
      month={month}
      onMonthChange={setMonth}
      disabled={(date) => isDateDisabled(date, disabledDates)}
      weekStartsOn={1}
      showOutsideDays
      classNames={{
        root: "relative w-full",
        months: "w-full",
        month: "w-full space-y-3",
        month_caption: "flex h-10 items-center",
        caption_label: "text-base font-semibold text-ink",
        nav: "absolute right-0 top-0 flex gap-1.5",
        button_previous:
          "flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-plum/20 text-plum disabled:opacity-30",
        button_next:
          "flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-plum/20 text-plum disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7",
        weekday: "py-1 text-center text-xs font-semibold text-taupe",
        week: "mt-1 grid grid-cols-7 gap-1",
        day: "flex items-center justify-center",
        day_button:
          "h-11 w-full rounded-xl text-sm font-medium text-ink transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:hover:bg-transparent",
        selected: "[&>button]:bg-plum [&>button]:font-bold [&>button]:text-cream [&>button]:hover:bg-plum",
        today: "[&>button]:ring-1 [&>button]:ring-plum/30",
        outside: "[&>button]:text-taupe/70",
        disabled: "[&>button]:text-ink/25 [&>button]:line-through",
        hidden: "invisible",
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
    />
  );
}
