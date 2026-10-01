"use client";
import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Info, Plus, Search } from "lucide-react";
import SelectionModal from "@/app/components/SelectionModal";
import { breadTypes } from "@/app/assets/constants";
import { isDrink } from "@/lib/product-helpers";
import {
  countCustomItems,
  formatEuro,
  productQuantity,
  setProductQuantity,
} from "@/lib/selection-pricing";
import { productImageKey, productImageLoader } from "@/lib/sanity-image";
import { cn } from "@/lib/utils";
import OrderLines from "./OrderLines";
import OrderPanel, { DeliveryDateNote, FreeDeliveryMeter, Totals } from "./OrderPanel";
import { Chip, Heading, PrimaryButton, ProgressBar, QuantityStepper } from "./ui";

const DIET_FILTERS = [
  { id: "all", label: "All" },
  { id: "non-vega", label: "Meat & fish" },
  { id: "vega", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
];

const DIET_BADGES = {
  "non-vega": { label: "Meat & fish", className: "bg-cream text-plum" },
  vega: { label: "Vega", className: "bg-leaf-light text-leaf" },
  vegan: { label: "Vegan", className: "bg-leaf text-[#F3F7EC]" },
};

function ProductCard({ product, quantity, onQuantity, onCustomize }) {
  const badge = DIET_BADGES[product.dietaryType];
  const selected = quantity > 0;
  return (
    <article
      className={cn(
        "flex items-center overflow-hidden rounded-[22px] border-2 bg-paper transition-shadow sm:flex-col sm:items-stretch hover:shadow-[0_18px_40px_-24px_rgba(56,38,40,0.45)]",
        selected ? "border-plum" : "border-plum/10"
      )}
    >
      {/* Mobile: a fixed square thumbnail, so every product is cropped the same.
          Desktop: a 4:3 photo across the top of the card. */}
      <div className="relative ml-3 h-[104px] w-[104px] shrink-0 overflow-hidden rounded-2xl bg-[#EEEBE6] sm:m-0 sm:aspect-[4/3] sm:h-auto sm:w-auto sm:rounded-none">
        {product.image && (
          <Image
            loader={productImageLoader(product.image, { aspect: 4 / 3, zoom: 1.55 })}
            src={productImageKey(product.image)}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 320px, (min-width: 640px) 45vw, 104px"
            className="object-cover"
          />
        )}
        {badge && (
          <span
            className={cn(
              "absolute left-3 top-3 hidden rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] sm:inline-block",
              badge.className
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3.5 pb-3.5 pt-3 sm:px-[18px] sm:pb-[18px] sm:pt-4">
        <h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] sm:text-[17px]">{product.name}</h3>
        {badge && (
          <span
            className={cn(
              "self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] sm:hidden",
              badge.className
            )}
          >
            {badge.label}
          </span>
        )}
        {product.description && (
          <p className="m-0 line-clamp-2 text-[13px] leading-[1.45] text-taupe">
            {product.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-base font-semibold">{formatEuro(product.price)}</span>
          {selected ? (
            <QuantityStepper
              label={product.name}
              value={quantity}
              onChange={onQuantity}
              variant="solid"
              size="sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => onQuantity(1)}
              className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-plum px-[18px] text-sm font-semibold text-plum hover:bg-plum hover:text-cream"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Add
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onCustomize}
          className="self-start pt-1 text-xs text-plum underline underline-offset-[3px]"
        >
          {isDrink(product) ? (
            "Details & allergens"
          ) : (
            <>
              <span className="sm:hidden">Customise</span>
              <span className="hidden sm:inline">Choose bread, sauce or toppings</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export default function ComposeCustom({
  formData,
  updateFormData,
  sandwichOptions,
  drinks,
  totalAmount,
  onContinue,
  onSwitchType,
}) {
  const [diet, setDiet] = useState("all");
  const [query, setQuery] = useState("");
  const [customizing, setCustomizing] = useState(null);

  const categories = useMemo(() => {
    const map = new Map();
    sandwichOptions.forEach((item) => {
      if (item.category && !map.has(item.category._id)) {
        map.set(item.category._id, { id: item.category._id, name: item.category.name, slug: item.category.slug });
      }
    });
    return Array.from(map.values());
  }, [sandwichOptions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sandwichOptions.filter((item) => {
      if (diet !== "all" && item.dietaryType !== diet) return false;
      if (!q) return true;
      return `${item.name} ${item.description || ""}`.toLowerCase().includes(q);
    });
  }, [sandwichOptions, diet, query]);

  const setQuantity = (product, quantity) => {
    // An emptied input is mid-typing, not a request to remove the item.
    if (quantity === "") return;
    updateFormData(
      "customSelection",
      setProductQuantity(formData.customSelection, product, quantity)
    );
  };

  const addVariant = (product, selection) =>
    updateFormData("customSelection", {
      ...formData.customSelection,
      [product._id]: [...(formData.customSelection[product._id] || []), selection],
    });

  const removeVariant = (productId, index) =>
    updateFormData("customSelection", {
      ...formData.customSelection,
      [productId]: (formData.customSelection[productId] || []).filter((_, i) => i !== index),
    });

  const target = Number(formData.totalSandwiches) || 0;
  const count = countCustomItems(formData.customSelection);
  const remaining = target - count;

  const panel = (
    <>
      <div className="flex items-baseline justify-between gap-3 pr-10 lg:pr-0">
        <h2 className="m-0 text-xl font-bold">Your order</h2>
        <DeliveryDateNote formData={formData} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">
            <strong className="text-[22px] tabular-nums">{count}</strong>{" "}
            <span className="text-taupe">of</span>
          </span>
          <QuantityStepper
            label="sandwiches in your order"
            value={formData.totalSandwiches}
            onChange={(value) => updateFormData("totalSandwiches", value)}
            step={5}
            min={20}
            size="sm"
          />
          <span className="ml-auto text-sm font-semibold text-plum">
            {remaining > 0 ? `${remaining} to go` : "Complete"}
          </span>
        </div>
        <ProgressBar value={target > 0 ? (count / target) * 100 : 0} />
        <span className="text-xs text-taupe">Minimum order: 20 sandwiches</span>
      </div>

      <div className="border-t border-plum/10 pt-4">
        <OrderLines
          formData={formData}
          sandwichOptions={sandwichOptions}
          drinks={drinks}
          onRemoveVariant={removeVariant}
        />
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
          <Heading title="Build your" accent="lunch." inline />
          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
            <button
              type="button"
              onClick={() => onSwitchType("variety")}
              className="text-sm font-medium text-plum underline underline-offset-[3px]"
            >
              Rather let us choose?
            </button>
            <label className="flex h-12 w-full items-center gap-2.5 rounded-full border border-plum/[0.18] bg-paper px-[18px] text-taupe sm:w-[280px]">
              <Search className="h-[18px] w-[18px]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the menu"
                aria-label="Search the menu"
                className="flex-1 bg-transparent text-sm text-ink outline-none"
              />
            </label>
          </div>
        </div>

        <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 bg-cream/95 px-4 py-3 backdrop-blur md:top-[84px] md:-mx-10 md:px-10 lg:mx-0 lg:px-0">
          <div className="flex gap-2 overflow-x-auto">
            {DIET_FILTERS.map((filter) => (
              <Chip key={filter.id} active={diet === filter.id} onClick={() => setDiet(filter.id)}>
                {filter.label}
              </Chip>
            ))}
            <span className="mx-1 w-px shrink-0 bg-plum/15" aria-hidden />
            {categories.map((category) => (
              <Chip
                key={category.id}
                onClick={() =>
                  document
                    .getElementById(`category-${category.slug}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {category.name}
              </Chip>
            ))}
          </div>
          <span className="flex items-center gap-2 text-[13px] text-taupe">
            <Info className="h-4 w-4 shrink-0 text-plum" />
            Every sandwich is available on{" "}
            {breadTypes
              .filter((b) => b.surcharge > 0)
              .map((b) => `${b.name.toLowerCase()} (+${formatEuro(b.surcharge)})`)
              .join(" or ")}
          </span>
        </div>

        {categories.map((category) => {
          const items = visible.filter((item) => item.category?._id === category.id);
          if (items.length === 0) return null;
          return (
            <section key={category.id} id={`category-${category.slug}`} className="scroll-mt-44 md:scroll-mt-52">
              <h2 className="mb-4 text-lg font-bold uppercase tracking-[-0.02em]">{category.name}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    quantity={productQuantity(formData.customSelection, product._id)}
                    onQuantity={(quantity) => setQuantity(product, quantity)}
                    onCustomize={() => setCustomizing(product)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {visible.length === 0 && (
          <p className="rounded-2xl bg-sand p-6 text-center text-taupe">
            No items match your filters.
          </p>
        )}
      </main>

      <OrderPanel
        barSummary={`${count} of ${target} selected`}
        barTotal={formatEuro(totalAmount)}
      >
        {panel}
      </OrderPanel>

      {customizing && (
        <SelectionModal
          isOpen={!!customizing}
          onClose={() => setCustomizing(null)}
          sandwich={customizing}
          onAdd={(selection) => addVariant(customizing, selection)}
        />
      )}
    </div>
  );
}
