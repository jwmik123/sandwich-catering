"use client";
import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  fromDateString,
  isClosed,
  isDateDisabled,
  isFullyBooked,
  nextAvailableDates,
  toDateString,
} from "@/lib/delivery-dates";
import { cn } from "@/lib/utils";

// Closed days get a dot, and a "Fully booked" (or "Closed") tag on hover,
// instead of the browser's not-allowed cursor.
function Day({ day, modifiers, className, children, ...props }) {
  const tag = modifiers.booked ? "Fully booked" : modifiers.closed ? "Closed" : null;
  return (
    <td {...props} className={cn(className, tag && "group relative")}>
      {children}
      {tag && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C98B4E]"
          />
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-plum px-2.5 py-1 text-[11px] font-semibold text-cream opacity-0 shadow-[0_8px_20px_-8px_rgba(56,38,40,0.6)] transition-opacity group-hover:opacity-100"
          >
            {tag}
          </span>
        </>
      )}
    </td>
  );
}

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
      modifiers={{
        booked: (date) => isFullyBooked(date, disabledDates),
        closed: (date) => isClosed(date, disabledDates),
      }}
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
          "h-11 w-full rounded-xl text-sm font-medium text-ink transition-colors hover:bg-sand disabled:cursor-default disabled:hover:bg-transparent",
        selected: "[&>button]:bg-plum [&>button]:font-bold [&>button]:text-cream [&>button]:hover:bg-plum",
        today: "[&>button]:ring-1 [&>button]:ring-plum/30",
        outside: "[&>button]:text-taupe/70",
        disabled: "[&>button]:text-ink/25",
        hidden: "invisible",
      }}
      components={{
        Day,
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
