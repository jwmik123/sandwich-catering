"use client";
import React from "react";
import Image from "next/image";
import { ArrowRight, Check, Minus, Phone, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const CATERING_PHONE = "06-15657447";
export const CATERING_PHONE_HREF = "tel:+31615657447";

export function Heading({ title, accent, as: Tag = "h1", size = "lg", inline = false, className }) {
  const sizes = {
    lg: "text-[40px] md:text-[52px]",
    md: "text-3xl md:text-4xl",
  };
  const accentSizes = {
    lg: "text-[46px] md:text-[60px]",
    md: "text-4xl md:text-5xl",
  };
  return (
    <div
      className={cn(
        "flex flex-col",
        inline && "lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-4",
        className
      )}
    >
      <Tag
        className={cn(
          "m-0 font-extrabold uppercase leading-[0.95] tracking-[-0.045em] text-ink",
          sizes[size]
        )}
      >
        {title}
      </Tag>
      {accent && (
        <span className={cn("accent-script leading-[0.95]", accentSizes[size])}>
          {accent}
        </span>
      )}
    </div>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-[26px] border border-plum/[0.12] bg-paper",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  label,
  size = "md",
  variant = "soft",
  editable = true,
  id,
}) {
  const dimensions = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const numeric = Number(value) || 0;
  const setValue = (next) => onChange(Math.max(min, next));

  const shells = {
    soft: "bg-sand",
    outline: "border-[1.5px] border-plum/20",
    solid: "bg-plum text-cream",
  };
  const minusStyles = {
    soft: "bg-cream text-plum",
    outline: "text-plum",
    solid: "bg-cream/10 text-cream",
  };
  const plusStyles = {
    soft: "bg-plum text-cream",
    outline: "text-plum",
    solid: "bg-cream/10 text-cream",
  };

  return (
    <div className={cn("inline-flex items-center rounded-full p-1", shells[variant])}>
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        onClick={() => setValue(numeric - step)}
        disabled={numeric <= min}
        className={cn(
          "flex items-center justify-center rounded-full transition-opacity disabled:opacity-40",
          dimensions,
          minusStyles[variant]
        )}
      >
        <Minus className="h-4 w-4" strokeWidth={2.4} />
      </button>
      {editable ? (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0))}
          onBlur={() => setValue(numeric)}
          className={cn(
            "bg-transparent text-center font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            size === "lg"
              ? "mx-1.5 h-11 w-[72px] rounded-xl border-[1.5px] border-dashed border-plum/30 bg-paper text-2xl hover:border-plum/60 focus:border-solid focus:border-plum"
              : "w-14 text-base"
          )}
        />
      ) : (
        <span className={cn("min-w-10 text-center font-bold tabular-nums", size === "lg" ? "text-2xl" : "text-base")}>
          {value}
        </span>
      )}
      <button
        type="button"
        aria-label={`More ${label}`}
        onClick={() => setValue(numeric + step)}
        className={cn(
          "flex items-center justify-center rounded-full",
          dimensions,
          plusStyles[variant]
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
      </button>
    </div>
  );
}

export function Chip({ active, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "h-10 whitespace-nowrap rounded-full border-[1.5px] px-4 text-sm font-medium transition-colors",
        active
          ? "border-plum bg-plum text-cream"
          : "border-plum/20 bg-transparent text-ink hover:border-plum/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const BUTTON_TONES = {
  plum: { button: "bg-plum text-cream", icon: "bg-cream text-plum" },
  light: { button: "bg-cream text-plum", icon: "bg-plum text-cream" },
  green: { button: "bg-[#2E7D4F] text-white hover:bg-[#276B43]", icon: "bg-white text-[#2E7D4F]" },
};

export function PrimaryButton({ children, className, tone = "plum", disabled, loading, ...props }) {
  const colors = BUTTON_TONES[tone];
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "group flex h-[58px] w-full items-center justify-between rounded-full pl-6 pr-2 text-base font-semibold transition-colors disabled:opacity-60",
        colors.button,
        className
      )}
      {...props}
    >
      <span>{children}</span>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5",
          colors.icon
        )}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <ArrowRight className="h-[18px] w-[18px]" />
        )}
      </span>
    </button>
  );
}

export function ProgressBar({ value, className, barClassName }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-[#F0E4D0]", className)}>
      <div
        className={cn("h-full rounded-full bg-plum transition-[width] duration-500", barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function CheckItem({ children }) {
  return (
    <span className="flex items-center gap-1.5">
      <Check className="h-4 w-4 text-plum" strokeWidth={2.4} />
      {children}
    </span>
  );
}

const PHASES = ["Choose", "Delivery", "Details & payment"];

export function OrderHeader({ phase, onHome }) {
  // phase 2 = composing, 3 = checkout (delivery + details + payment on one page)
  const activeIndex = phase === 2 ? 0 : 1;
  return (
    <header className="sticky top-0 z-30 border-b border-plum/[0.12] bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:h-[84px] md:px-10">
        <button type="button" onClick={onHome} aria-label="Back to start" className="shrink-0">
          <Image
            src="/images/logo-catering.png"
            alt="The Sandwich Bar Catering"
            width={52}
            height={52}
            className="h-11 w-11 md:h-[52px] md:w-[52px]"
          />
        </button>

        <ol className="hidden items-center gap-3 text-sm font-medium md:flex">
          {PHASES.map((label, index) => {
            const done = index < activeIndex;
            const active =
              index === activeIndex || (activeIndex === 1 && index === 2);
            return (
              <React.Fragment key={label}>
                {index > 0 && (
                  <li
                    aria-hidden
                    className={cn("h-[1.5px] w-10", done || active ? "bg-plum" : "bg-plum/25")}
                  />
                )}
                <li className={cn("flex items-center gap-2.5", !active && !done && "text-taupe")}>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold",
                      done
                        ? "bg-leaf-light text-leaf"
                        : active
                          ? "bg-plum text-cream"
                          : "border-[1.5px] border-plum/30"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  {label}
                </li>
              </React.Fragment>
            );
          })}
        </ol>

        <span className="text-sm text-taupe md:hidden">
          Step {activeIndex + 1} of 2 · {activeIndex === 0 ? "Choose" : "Checkout"}
        </span>

        <a
          href={CATERING_PHONE_HREF}
          className="hidden items-center gap-2 text-sm text-taupe hover:text-ink sm:flex"
        >
          <Phone className="h-4 w-4" />
          {CATERING_PHONE}
        </a>
      </div>
    </header>
  );
}
