"use client";
import React, { useState } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { urlFor } from "@/sanity/lib/image";
import { formatEuro } from "@/lib/selection-pricing";
import { Chip, PrimaryButton, QuantityStepper } from "@/app/components/order/ui";

const STORAGE_KEY = "upsellSelectedProducts";

const UpsellPopup = ({ isOpen, onClose, config, onAddProducts }) => {
  const [selectedProducts, setSelectedProducts] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  if (!config || !config.products || config.products.length === 0) {
    return null;
  }

  const getProductState = (productId) =>
    selectedProducts[productId] || { quantity: 0, toppings: [] };

  const handleQuantityChange = (productId, quantity) => {
    const numQuantity = Math.max(0, parseInt(quantity) || 0);
    setSelectedProducts((prev) => {
      const current = prev[productId] || { quantity: 0, toppings: [] };
      const updated = {
        ...prev,
        [productId]: { ...current, quantity: numQuantity },
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleToppingChange = (productId, toppingName, checked) => {
    setSelectedProducts((prev) => {
      const current = prev[productId] || { quantity: 0, toppings: [] };
      const toppings = checked
        ? [...current.toppings, toppingName]
        : current.toppings.filter((t) => t !== toppingName);
      const updated = { ...prev, [productId]: { ...current, toppings } };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddToOrder = () => {
    const productsToAdd = Object.entries(selectedProducts)
      .filter(([_, state]) => state.quantity > 0)
      .map(([productId, state]) => {
        const product = config.products.find((p) => p._id === productId);
        return {
          product,
          quantity: state.quantity,
          toppings: state.toppings || [],
        };
      });

    if (productsToAdd.length > 0) {
      onAddProducts(productsToAdd);
    }

    onClose();
  };

  const handleNoThanks = () => {
    onClose();
  };

  const totalItems = Object.values(selectedProducts).reduce(
    (sum, state) => sum + (state.quantity || 0),
    0
  );

  // Shown on the button only; the order is priced the same way as before.
  const totalPrice = config.products.reduce((sum, product) => {
    const state = getProductState(product._id);
    const toppingCost = (state.toppings || []).reduce(
      (t, name) => t + (product.toppingOptions?.find((o) => o.name === name)?.price || 0),
      0
    );
    return sum + (state.quantity || 0) * (product.price + toppingCost);
  }, 0);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleNoThanks()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:items-center sm:p-6">
          <DialogPrimitive.Content
            aria-describedby={config.popupDescription ? "upsell-description" : undefined}
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-cream text-ink shadow-[0_30px_60px_-30px_rgba(56,38,40,0.6)] outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 sm:max-h-[88vh] sm:w-[560px] sm:rounded-[28px] sm:data-[state=open]:slide-in-from-bottom-4"
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-8 sm:px-7">
              <div className="flex flex-col gap-1.5">
                <span className="font-tomatoes text-3xl lowercase leading-[1.15] text-plum">
                  make it complete
                </span>
                <DialogPrimitive.Title className="m-0 text-2xl font-extrabold uppercase leading-[1] tracking-[-0.03em]">
                  {config.popupTitle || "Would you like to add some extras?"}
                </DialogPrimitive.Title>
                {config.popupDescription && (
                  <p id="upsell-description" className="m-0 text-[13px] leading-[1.45] text-taupe">
                    {config.popupDescription}
                  </p>
                )}
              </div>
              <DialogPrimitive.Close
                aria-label="Close"
                className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-taupe hover:bg-sand hover:text-ink"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>

            <ul className="m-0 flex list-none flex-col gap-3 overflow-y-auto px-5 pb-4 sm:px-7">
              {config.products.map((product) => {
                const productState = getProductState(product._id);
                const selected = productState.quantity > 0;
                return (
                  <li
                    key={product._id}
                    className={`flex flex-col gap-3 rounded-[22px] border-2 bg-paper p-3 transition-colors ${
                      selected ? "border-plum" : "border-plum/10"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative h-[76px] w-[96px] shrink-0 overflow-hidden rounded-2xl bg-[#EEEBE6]">
                        {product.image && (
                          <Image
                            src={urlFor(product.image).width(240).height(190).fit("crop").url()}
                            alt={product.name}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-semibold">{product.name}</span>
                        {product.description && (
                          <span className="line-clamp-2 text-xs leading-[1.4] text-taupe">
                            {product.description}
                          </span>
                        )}
                        <span className="mt-1 text-sm font-semibold">{formatEuro(product.price)}</span>
                      </div>
                      <QuantityStepper
                        label={product.name}
                        value={productState.quantity || 0}
                        onChange={(value) => {
                          if (value === "") return;
                          handleQuantityChange(product._id, value);
                        }}
                        variant={selected ? "solid" : "outline"}
                        size="sm"
                      />
                    </div>

                    {product.hasToppings && product.toppingOptions?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-plum/10 pt-3">
                        <span className="text-xs font-semibold text-taupe">Toppings</span>
                        {product.toppingOptions.map((topping) => {
                          const active = productState.toppings.includes(topping.name);
                          return (
                            <Chip
                              key={topping.name}
                              active={active}
                              className="h-8 px-3 text-xs"
                              onClick={() => handleToppingChange(product._id, topping.name, !active)}
                            >
                              {topping.name}
                              {topping.price > 0 && (
                                <span className="ml-1 opacity-70">+{formatEuro(topping.price)}</span>
                              )}
                            </Chip>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col-reverse gap-2 border-t border-plum/10 bg-cream px-5 py-4 sm:flex-row sm:items-center sm:px-7">
              <button
                type="button"
                onClick={handleNoThanks}
                className="h-12 rounded-full px-5 text-sm font-semibold text-plum underline-offset-[3px] hover:underline"
              >
                No thanks
              </button>
              <PrimaryButton onClick={handleAddToOrder} disabled={totalItems === 0} className="sm:flex-1">
                {totalItems > 0
                  ? `Add ${totalItems} item${totalItems !== 1 ? "s" : ""} · ${formatEuro(totalPrice)}`
                  : "Add to order"}
              </PrimaryButton>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default UpsellPopup;
