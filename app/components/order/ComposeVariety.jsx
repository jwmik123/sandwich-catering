"use client";
import React, { useEffect, useState } from "react";
import { GLUTEN_FREE_SURCHARGE, SANDWICH_PRICE_VARIETY } from "@/app/assets/constants";
import { formatEuro } from "@/lib/selection-pricing";
import { cn } from "@/lib/utils";
import OrderLines from "./OrderLines";
import OrderPanel, { DeliveryDateNote, FreeDeliveryMeter, Totals } from "./OrderPanel";
import { Card, Chip, Heading, PrimaryButton, QuantityStepper } from "./ui";

const TYPES = [
  { key: "nonVega", label: "Chicken, meat & fish", sub: "Carpaccio, spicy chicken, salmon…", color: "#4D343F", ink: "#FDF4E5" },
  { key: "vega", label: "Vegetarian", sub: "Avocado special, goat cheese…", color: "#8E6E62", ink: "#FDF4E5" },
  { key: "vegan", label: "Vegan", sub: "Plant based nduja, hummus…", color: "#D4B08A", ink: "#382628" },
  { key: "glutenFree", label: "Gluten-free", sub: `+ ${formatEuro(GLUTEN_FREE_SURCHARGE)} per sandwich`, color: "#F0E0C6", ink: "#382628" },
];

// Shares of nonVega / vega / vegan. Gluten-free is always picked by hand
// because it costs extra.
const MIXES = [
  { id: "balanced", label: "Balanced", ratios: [0.4, 0.4, 0.2] },
  { id: "greener", label: "More green", ratios: [0.2, 0.5, 0.3] },
  { id: "meatFree", label: "Meat-free", ratios: [0, 0.6, 0.4] },
];

const sumSelection = (selection) =>
  (selection.nonVega || 0) + (selection.vega || 0) + (selection.vegan || 0) + (selection.glutenFree || 0);

const splitMix = (total, mixId, glutenFree = 0) => {
  const mix = MIXES.find((m) => m.id === mixId) || MIXES[0];
  const rest = Math.max(0, total - glutenFree);
  const next = {
    nonVega: Math.round(rest * mix.ratios[0]),
    vega: Math.round(rest * mix.ratios[1]),
    vegan: Math.round(rest * mix.ratios[2]),
    glutenFree,
  };
  next.vega += rest - (next.nonVega + next.vega + next.vegan);
  return next;
};

export default function ComposeVariety({
  formData,
  updateFormData,
  drinks,
  totalAmount,
  onContinue,
  onSwitchType,
  onRemoveAddon,
  sandwichOptions,
}) {
  const [mix, setMix] = useState("balanced");
  const total = Number(formData.totalSandwiches) || 0;
  const selection = formData.varietySelection;
  const distributed = sumSelection(selection);

  // Start from a balanced mix the first time this screen opens.
  useEffect(() => {
    if (sumSelection(formData.varietySelection) === 0 && total > 0) {
      updateFormData("varietySelection", splitMix(total, "balanced"));
    } else {
      setMix("custom");
    }
    // Only on first render: later changes are the user's.
  }, []);

  const applyMix = (mixId) => {
    setMix(mixId);
    updateFormData("varietySelection", splitMix(total, mixId, selection.glutenFree || 0));
  };

  const changeTotal = (value) => {
    updateFormData("totalSandwiches", value);
    const next = Number(value) || 0;
    if (mix !== "custom" && next >= 20) {
      updateFormData("varietySelection", splitMix(next, mix, selection.glutenFree || 0));
    }
  };

  const changeType = (key, value) => {
    if (value === "") return;
    setMix("custom");
    updateFormData("varietySelection", { ...selection, [key]: Math.max(0, Number(value) || 0) });
  };

  const changeDrink = (slug, value) => {
    if (value === "") return;
    updateFormData("drinks", { ...formData.drinks, [slug]: Math.max(0, Number(value) || 0) });
  };

  const balance =
    distributed === total
      ? { text: `✓ All ${total} sandwiches distributed`, className: "text-leaf" }
      : distributed < total
        ? { text: `${total - distributed} left to distribute`, className: "text-[#9A4A1F]" }
        : { text: `${distributed - total} more than your ${total} — that's fine, you'll get ${distributed}`, className: "text-taupe" };

  const panel = (
    <>
      <div className="flex items-baseline justify-between gap-3 pr-10 lg:pr-0">
        <h2 className="m-0 text-xl font-bold">Your order</h2>
        <DeliveryDateNote formData={formData} />
      </div>
      <div className="border-t border-plum/10 pt-4">
        <OrderLines
          formData={formData}
          sandwichOptions={sandwichOptions}
          drinks={drinks}
          onRemoveAddon={onRemoveAddon}
          compact
        />
      </div>
      <div className="flex flex-col gap-1 text-sm text-taupe">
        <div className="flex justify-between">
          <span>{distributed} × {formatEuro(SANDWICH_PRICE_VARIETY)}</span>
          <span className="tabular-nums">{formatEuro(distributed * SANDWICH_PRICE_VARIETY)}</span>
        </div>
        {selection.glutenFree > 0 && (
          <div className="flex justify-between">
            <span>Gluten-free surcharge</span>
            <span className="tabular-nums">{formatEuro(selection.glutenFree * GLUTEN_FREE_SURCHARGE)}</span>
          </div>
        )}
      </div>
      <FreeDeliveryMeter totalAmount={totalAmount} />
      <div className="border-t border-plum/10 pt-4">
        <Totals totalAmount={totalAmount} />
        <p className="mt-2 text-xs text-taupe">Delivery costs are calculated at checkout.</p>
      </div>
      <PrimaryButton onClick={onContinue}>Continue to delivery</PrimaryButton>
    </>
  );

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pb-16 pt-8 md:px-10 lg:flex-row lg:pt-10">
      <main className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <Heading title="Let us choose," accent="always spot on." inline />
            <p className="m-0 max-w-[620px] text-base leading-relaxed text-taupe">
              A varied mix of our specials, split the way you like. One price per sandwich:{" "}
              {formatEuro(SANDWICH_PRICE_VARIETY)} excl. VAT.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSwitchType("custom")}
            className="text-sm font-medium text-plum underline underline-offset-[3px]"
          >
            Rather pick them yourself?
          </button>
        </div>

        <Card className="flex flex-col gap-5 p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-lg font-semibold">Which mix?</h2>
              <div className="flex items-center gap-1 rounded-full bg-sand py-0.5 pl-3 pr-1 text-[13px]">
                <span className="text-taupe">for</span>
                <QuantityStepper
                  label="sandwiches"
                  value={formData.totalSandwiches}
                  onChange={changeTotal}
                  step={5}
                  min={20}
                  size="sm"
                  variant="outline"
                />
                <span className="pr-2 text-taupe">sandwiches</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MIXES.map((m) => (
                <Chip key={m.id} active={mix === m.id} onClick={() => applyMix(m.id)}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex h-14 gap-[3px] overflow-hidden rounded-2xl" aria-hidden>
            {TYPES.filter((t) => (selection[t.key] || 0) > 0).map((t) => (
              <div
                key={t.key}
                className="flex min-w-9 items-center justify-center text-[15px] font-bold transition-[flex-grow] duration-500"
                style={{ flexGrow: selection[t.key], flexBasis: 0, background: t.color, color: t.ink }}
              >
                {selection[t.key]}
              </div>
            ))}
            {distributed === 0 && <div className="flex-1 bg-sand" />}
          </div>

          <div className="grid grid-cols-1 gap-x-7 gap-y-1 md:grid-cols-2">
            {TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-3.5 border-b border-plum/[0.08] py-2.5">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(56,38,40,0.15)]"
                  style={{ background: t.color }}
                />
                <div className="flex flex-1 flex-col">
                  <span className="text-[15px] font-semibold">{t.label}</span>
                  <span className="text-xs text-taupe">{t.sub}</span>
                </div>
                <QuantityStepper
                  label={t.label}
                  value={selection[t.key] || 0}
                  onChange={(value) => changeType(t.key, value)}
                  variant="outline"
                  size="sm"
                />
              </div>
            ))}
          </div>
          <span className={cn("text-[13px] font-semibold", balance.className)}>{balance.text}</span>
        </Card>

        {drinks.length > 0 && (
          <Card className="flex flex-col gap-4 p-5 md:p-7">
            <h2 className="m-0 text-lg font-semibold">Drinks with that?</h2>
            <div className="grid grid-cols-1 gap-x-7 gap-y-3 md:grid-cols-2">
              {drinks.map((drink) => (
                <div key={drink._id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{drink.name}</span>
                    <span className="text-xs text-taupe">
                      {formatEuro(drink.price)} each{drink.description ? ` · ${drink.description}` : ""}
                    </span>
                  </div>
                  <QuantityStepper
                    label={drink.name}
                    value={formData.drinks?.[drink.slug] || 0}
                    onChange={(value) => changeDrink(drink.slug, value)}
                    variant="outline"
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>

      <OrderPanel
        barSummary={`${distributed} sandwiches`}
        barTotal={formatEuro(totalAmount)}
      >
        {panel}
      </OrderPanel>
    </div>
  );
}
