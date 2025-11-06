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
import { urlFor } from "@/sanity/lib/image";
import Image from "next/image";

const UpsellPopup = ({ isOpen, onClose, config, onAddProducts }) => {
  const [selectedProducts, setSelectedProducts] = useState({});

  if (!config || !config.products || config.products.length === 0) {
    return null;
  }

  const handleQuantityChange = (productId, quantity) => {
    const numQuantity = Math.max(0, parseInt(quantity) || 0);
    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: numQuantity,
    }));
  };

  const handleAddToOrder = () => {
    // Filter out products with 0 quantity
    const productsToAdd = Object.entries(selectedProducts)
      .filter(([_, quantity]) => quantity > 0)
      .map(([productId, quantity]) => {
        const product = config.products.find((p) => p._id === productId);
        return {
          product,
          quantity,
        };
      });

    if (productsToAdd.length > 0) {
      onAddProducts(productsToAdd);
    }

    // Mark that the popup has been shown
    localStorage.setItem("varietyPopupShown", "true");
    onClose();
  };

  const handleNoThanks = () => {
    // Mark that the popup has been shown
    localStorage.setItem("varietyPopupShown", "true");
    onClose();
  };

  const totalItems = Object.values(selectedProducts).reduce(
    (sum, qty) => sum + qty,
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
          {config.products.map((product) => (
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
                    value={selectedProducts[product._id] || ""}
                    onChange={(e) =>
                      handleQuantityChange(product._id, e.target.value)
                    }
                    className="w-16 h-8 text-center"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ))}
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
