"use client";
import React from "react";
import { FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import QuoteButton from "@/app/components/QuoteButton";
import { breadTypes } from "@/app/assets/constants";
import { isDrink } from "@/lib/product-helpers";

const OrderSummaryStep = ({
  formData,
  updateFormData,
  setCurrentStep,
  sandwichOptions,
  secondaryButtonClasses,
  totalAmount,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center text-lg font-medium text-gray-700">
        <FileText className="w-5 h-5" />
        <h2 className="text-gray-700">Order summary</h2>
      </div>

      <div className="space-y-4">
        <div className="p-6 space-y-4 rounded-lg bg-custom-gray/10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">
                Total number of sandwiches
              </p>
              <p className="text-lg font-medium">{formData.totalSandwiches}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type of order</p>
              <p className="text-lg font-medium">
                {formData.selectionType === "custom"
                  ? "Create your own selection"
                  : "Variety offer"}
              </p>
            </div>
          </div>

          {formData.selectionType === "custom" ? (
            <div className="pt-4 mt-4 border-t">
              <p className="mb-2 text-sm text-gray-500">Selected sandwiches</p>
              <div className="space-y-4">
                {Object.entries(formData.customSelection)
                  .filter(([_, selections]) => selections?.length > 0)
                  .map(([id, selections]) => {
                    const sandwich = sandwichOptions.find((s) => s._id === id);
                    return (
                      <div key={id} className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {sandwich?.name || "Onbekend broodje"}
                        </div>
                        {selections.map((selection, index) => {
                          const breadType = breadTypes.find(
                            (b) => b.id === selection.breadType
                          )?.name;

                          return (
                            <div
                              key={index}
                              className="flex justify-between pl-4 text-sm"
                            >
                              <span className="text-gray-600">
                                {selection.quantity}x
                                {!isDrink(sandwich) &&
                                  breadType &&
                                  ` - ${breadType}`}
                                {selection.sauce !== "geen" &&
                                  ` with ${selection.sauce}`}
                                {selection.toppings &&
                                  selection.toppings.length > 0 &&
                                  ` with ${selection.toppings.join(", ")}`}
                              </span>
                              <span className="font-medium text-gray-900">
                                €{selection.subTotal.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
              <div className="pt-4 mt-4 border-t">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total amount</span>
                  <span>€{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm text-gray-500">
                  <span>Total number of sandwiches</span>
                  <span>{formData.totalSandwiches} sandwiches</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-4 mt-4 border-t">
              <p className="mb-2 text-sm text-gray-500">
                Distribution of sandwiches
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Chicken, Meat, Fish</span>
                  <span>{formData.varietySelection.nonVega} sandwiches</span>
                </div>
                <div className="flex justify-between">
                  <span>Vegetarian</span>
                  <span>{formData.varietySelection.vega} sandwiches</span>
                </div>
                <div className="flex justify-between">
                  <span>Vegan</span>
                  <span>{formData.varietySelection.vegan} sandwiches</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formData.totalSandwiches} sandwiches</span>
                  </div>
                </div>
              </div>
              {/* Drinks section for variety selection */}
              {formData.addDrinks && (formData.drinks?.verseJus > 0 || formData.drinks?.sodas > 0 || formData.drinks?.smoothies > 0) && (
                <div className="pt-4 mt-4 border-t">
                  <p className="mb-2 text-sm text-gray-500">Drinks</p>
                  <div className="space-y-2">
                    {formData.drinks?.verseJus > 0 && (
                      <div className="flex justify-between">
                        <span>Fresh Juice</span>
                        <span>{formData.drinks.verseJus}x €{(formData.drinks.verseJus * 3.62).toFixed(2)}</span>
                      </div>
                    )}
                    {formData.drinks?.sodas > 0 && (
                      <div className="flex justify-between">
                        <span>Sodas</span>
                        <span>{formData.drinks.sodas}x €{(formData.drinks.sodas * 2.71).toFixed(2)}</span>
                      </div>
                    )}
                    {formData.drinks?.smoothies > 0 && (
                      <div className="flex justify-between">
                        <span>Smoothies</span>
                        <span>{formData.drinks.smoothies}x €{(formData.drinks.smoothies * 3.62).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="pt-4 mt-4 border-t">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total amount</span>
                  <span>€{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm text-gray-500">
                  <span>Total number of sandwiches</span>
                  <span>{formData.totalSandwiches} sandwiches</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="allergies" className="text-base">
            Allergies or comments?
          </Label>
          <Textarea
            placeholder="Add allergies or comments"
            className="mt-2"
            value={formData.allergies}
            onChange={(e) => updateFormData("allergies", e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="pt-4 mt-4 w-full">
            <QuoteButton
              formData={formData}
              sandwichOptions={sandwichOptions}
              buttonClasses={secondaryButtonClasses}
            />
          </div>
          <div className="pt-4 mt-4 w-full">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-2 py-2 w-full font-medium text-gray-700 rounded-md bg-custom-gray/10 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Update order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryStep; 