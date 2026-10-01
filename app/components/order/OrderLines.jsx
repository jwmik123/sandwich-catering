"use client";
import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { breadTypes } from "@/app/assets/constants";
import { isDrink } from "@/lib/product-helpers";
import { defaultBreadType, formatEuro } from "@/lib/selection-pricing";
import { productImageKey, productImageLoader } from "@/lib/sanity-image";

const VARIETY_LABELS = [
  { key: "nonVega", label: "Chicken, meat & fish" },
  { key: "vega", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "glutenFree", label: "Gluten-free" },
];

const variantDetails = (product, selection) => {
  const details = [];
  if (!isDrink(product) && selection.breadType && selection.breadType !== defaultBreadType(product)) {
    details.push(breadTypes.find((b) => b.id === selection.breadType)?.name);
  }
  if (selection.sauce && selection.sauce !== "geen") details.push(`with ${selection.sauce}`);
  if (selection.toppings?.length > 0) details.push(`+ ${selection.toppings.join(", ")}`);
  return details.filter(Boolean).join(" · ");
};

function Thumb({ product }) {
  if (!product?.image) {
    return <span className="block h-[34px] w-11 shrink-0 rounded-lg bg-[#F0E4D0]" />;
  }
  return (
    <Image
      loader={productImageLoader(product.image, { aspect: 4 / 3, zoom: 1.7 })}
      src={productImageKey(product.image)}
      alt=""
      width={44}
      height={34}
      className="h-[34px] w-11 shrink-0 rounded-lg bg-[#EEEBE6] object-cover"
    />
  );
}

export default function OrderLines({
  formData,
  sandwichOptions = [],
  drinks = [],
  onRemoveVariant,
  onRemoveAddon,
  compact = false,
}) {
  const lines = [];

  if (formData.selectionType === "custom") {
    Object.entries(formData.customSelection || {}).forEach(([productId, variants]) => {
      const product = sandwichOptions.find((p) => p._id === productId);
      (variants || []).forEach((selection, index) => {
        lines.push(
          <li key={`${productId}-${index}`} className="flex items-center gap-3 text-sm">
            {!compact && <Thumb product={product} />}
            <span className="min-w-7 font-bold tabular-nums">{selection.quantity}×</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{product?.name || "Unknown item"}</span>
              {variantDetails(product, selection) && (
                <span className="truncate text-xs text-taupe">{variantDetails(product, selection)}</span>
              )}
            </span>
            <span className="tabular-nums">{formatEuro(selection.subTotal)}</span>
            {onRemoveVariant && (
              <button
                type="button"
                aria-label={`Remove ${product?.name || "item"}`}
                onClick={() => onRemoveVariant(productId, index)}
                className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-taupe hover:bg-sand hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      });
    });
  }

  if (formData.selectionType === "variety") {
    VARIETY_LABELS.forEach(({ key, label }) => {
      const quantity = formData.varietySelection?.[key] || 0;
      if (quantity <= 0) return;
      lines.push(
        <li key={key} className="flex items-center gap-3 text-sm">
          <span className="min-w-7 font-bold tabular-nums">{quantity}×</span>
          <span className="flex-1">{label}</span>
        </li>
      );
    });

    (formData.upsellAddons || []).forEach((addon, index) => {
      lines.push(
        <li key={`addon-${addon.id || index}`} className="flex items-center gap-3 text-sm">
          <span className="min-w-7 font-bold tabular-nums">{addon.quantity}×</span>
          <span className="flex-1">{addon.name}</span>
          <span className="tabular-nums">{formatEuro(addon.subTotal)}</span>
          {onRemoveAddon && (
            <button
              type="button"
              aria-label={`Remove ${addon.name}`}
              onClick={() => onRemoveAddon(addon.id)}
              className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-taupe hover:bg-sand hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      );
    });
  }

  drinks.forEach((drink) => {
    const quantity = formData.drinks?.[drink.slug] || 0;
    if (quantity <= 0) return;
    lines.push(
      <li key={`drink-${drink._id}`} className="flex items-center gap-3 text-sm">
        <span className="min-w-7 font-bold tabular-nums">{quantity}×</span>
        <span className="flex-1">{drink.name}</span>
        <span className="tabular-nums">{formatEuro(quantity * drink.price)}</span>
      </li>
    );
  });

  if (lines.length === 0) {
    return <p className="text-sm text-taupe">Nothing selected yet.</p>;
  }

  return <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{lines}</ul>;
}
