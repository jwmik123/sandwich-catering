"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { urlFor } from "@/sanity/lib/image";
import Image from "next/image";

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {config.popupTitle || "Would you like to add some extras?"}
          </DialogTitle>
          {config.popupDescription && (
            <DialogDescription className="text-base">
              {config.popupDescription}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          {config.products.map((product) => {
            const productState = getProductState(product._id);
            return (
              <div
                key={product._id}
                className="flex flex-col p-3 rounded-lg shadow-md transition-shadow"
              >
                {product.image && (
                  <div className="relative w-full h-32 mb-3 overflow-hidden rounded-md">
                    <Image
                      src={urlFor(product.image).width(400).height(300).url()}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <h4 className="font-medium text-gray-900">{product.name}</h4>
                {product.description && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {product.hasToppings && product.toppingOptions?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-gray-700">Toppings:</p>
                    <div className="space-y-1">
                      {product.toppingOptions.map((topping) => (
                        <div key={topping.name} className="flex items-center gap-2">
                          <Checkbox
                            id={`${product._id}-${topping.name}`}
                            checked={productState.toppings.includes(topping.name)}
                            onCheckedChange={(checked) =>
                              handleToppingChange(product._id, topping.name, checked)
                            }
                          />
                          <label
                            htmlFor={`${product._id}-${topping.name}`}
                            className="text-xs text-gray-600 cursor-pointer"
                          >
                            {topping.name}
                            {topping.price > 0 && (
                              <span className="ml-1 text-gray-400">
                                (+€{topping.price.toFixed(2)})
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-semibold text-gray-700">
                    €{product.price.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`quantity-${product._id}`} className="text-xs text-gray-600">
                      Qty:
                    </label>
                    <Input
                      id={`quantity-${product._id}`}
                      type="number"
                      min="0"
                      value={productState.quantity || ""}
                      onChange={(e) =>
                        handleQuantityChange(product._id, e.target.value)
                      }
                      className="w-16 h-8 text-center"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalItems > 0 && (
          <div className="p-3 rounded-md bg-blue-50">
            <p className="text-sm font-medium text-blue-900">
              Selected {totalItems} item{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleNoThanks}
            className="w-full sm:w-auto"
          >
            No thanks
          </Button>
          <Button
            onClick={handleAddToOrder}
            disabled={totalItems === 0}
            className="w-full sm:w-auto"
          >
            {totalItems > 0 ? `Add ${totalItems} item${totalItems !== 1 ? "s" : ""} to order` : "Add to order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpsellPopup;
