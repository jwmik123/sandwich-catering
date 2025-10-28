"use client";
import React from "react";
import { Utensils } from "lucide-react";
import MenuCategories from "@/app/components/MenuCategories";
import VarietySelector from "@/app/components/VarietySelector";
import { SANDWICH_PRICE_VARIETY, GLUTEN_FREE_SURCHARGE } from "@/app/assets/constants";

const SelectionTypeStep = ({ formData, updateFormData, sandwichOptions, drinks = [] }) => {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center text-lg font-medium text-custom-gray">
        <Utensils className="w-5 h-5" />
        <h2 className="text-gray-700">Choose your Selection</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            formData.selectionType === "custom"
              ? "border-black bg-beige-50"
              : "border-custom-gray/20 hover:border-custom-gray/30"
          }`}
          onClick={() => updateFormData("selectionType", "custom")}
        >
          <h3 className="mb-2 text-lg font-medium">
            Create your own selection
          </h3>
          <p className="text-sm text-custom-gray">Choose your sandwiches</p>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            formData.selectionType === "variety"
              ? "border-black bg-beige-50"
              : "border-custom-gray/20 hover:border-custom-gray/30"
          }`}
          onClick={() => updateFormData("selectionType", "variety")}
        >
          <h3 className="mb-2 text-lg font-medium">Variety Offer</h3>
          <p className="text-sm text-custom-gray">Let us surprise you! :)</p>
        </div>
      </div>

      {formData.selectionType === "custom" && (
        <div className="mt-6">
          <MenuCategories
            sandwichOptions={sandwichOptions}
            formData={formData}
            updateFormData={updateFormData}
          />

          <div className="p-4 mt-6 rounded-lg bg-custom-gray/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-custom-gray">Selected items</p>
                <p className="text-lg font-medium">
                  {Object.values(formData.customSelection)
                    .flat()
                    .reduce(
                      (total, selection) => total + selection.quantity,
                      0
                    )}
                </p>
              </div>
              <div>
                <p className="text-sm text-custom-gray">Total amount</p>
                <p className="text-lg font-medium">
                  €
                  {Object.values(formData.customSelection)
                    .flat()
                    .reduce(
                      (total, selection) => total + selection.subTotal,
                      0
                    )
                    .toFixed(2)}{" "}
                  excl. VAT
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {formData.selectionType === "variety" && (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Choose a distribution
              </h3>
              <VarietySelector
                totalSandwiches={formData.totalSandwiches}
                formData={formData}
                updateFormData={updateFormData}
              />
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Add some drinks
              </h3>

              <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-md font-medium text-gray-800">Select Drinks</h4>

                  {drinks.length > 0 ? (
                    <>
                      {drinks.map((drink) => {
                        const drinkSlug = drink.slug;
                        const drinkQuantity = formData.drinks?.[drinkSlug] || 0;

                        return (
                          <div key={drink._id} className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700">{drink.name}</label>
                              <div className="text-xs text-gray-500">€{drink.price.toFixed(2)} each</div>
                              {drink.description && (
                                <div className="text-xs text-gray-400">{drink.description}</div>
                              )}
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={drinkQuantity}
                              onChange={(e) => {
                                const value = Math.max(0, parseInt(e.target.value) || 0);
                                updateFormData("drinks", {
                                  ...formData.drinks,
                                  [drinkSlug]: value
                                });
                              }}
                              className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                          </div>
                        );
                      })}

                      {/* Total drinks summary */}
                      {drinks.some(drink => (formData.drinks?.[drink.slug] || 0) > 0) && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Total drinks: {drinks.reduce((total, drink) => total + (formData.drinks?.[drink.slug] || 0), 0)}
                            </span>
                            <span className="font-medium text-gray-800">
                              €{drinks.reduce((total, drink) => {
                                const quantity = formData.drinks?.[drink.slug] || 0;
                                return total + (quantity * drink.price);
                              }, 0).toFixed(2)} excl. VAT
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">No drinks available at the moment.</div>
                  )}
                </div>
            </div>
          </div>
          
          {/* Total amount calculation - full width */}
          <div className="pt-4 mt-6 border-t">
            <div className="p-4 space-y-2 rounded-md bg-custom-gray/10">
              <div className="flex justify-between text-sm text-custom-gray">
                <span>Price per sandwich</span>
                <span>€{SANDWICH_PRICE_VARIETY.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-sm text-custom-gray">
                <span>Number of sandwiches</span>
                <span>{(formData.varietySelection.vega || 0) + (formData.varietySelection.nonVega || 0) + (formData.varietySelection.vegan || 0) + (formData.varietySelection.glutenFree || 0)}</span>
              </div>
              {formData.varietySelection?.glutenFree > 0 && (
                <div className="flex justify-between text-sm text-custom-gray">
                  <span>Gluten-free surcharge ({formData.varietySelection.glutenFree}x)</span>
                  <span>€{(formData.varietySelection.glutenFree * GLUTEN_FREE_SURCHARGE).toFixed(2)}</span>
                </div>
              )}
              {drinks.length > 0 && drinks.some(drink => (formData.drinks?.[drink.slug] || 0) > 0) && (
                <>
                  <div className="flex justify-between text-sm text-custom-gray">
                    <span>Drinks total</span>
                    <span>
                      €{drinks.reduce((total, drink) => {
                        const quantity = formData.drinks?.[drink.slug] || 0;
                        return total + (quantity * drink.price);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 font-medium border-t text-custom-gray">
                <span>Total amount</span>
                <span>
                  €{(
                    ((formData.varietySelection.vega || 0) +
                     (formData.varietySelection.nonVega || 0) +
                     (formData.varietySelection.vegan || 0)) * SANDWICH_PRICE_VARIETY +
                    (formData.varietySelection?.glutenFree ? formData.varietySelection.glutenFree * (SANDWICH_PRICE_VARIETY + GLUTEN_FREE_SURCHARGE) : 0) +
                    (drinks.length > 0 ? drinks.reduce((total, drink) => {
                      const quantity = formData.drinks?.[drink.slug] || 0;
                      return total + (quantity * drink.price);
                    }, 0) : 0)
                  ).toFixed(2)} excl. VAT
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SelectionTypeStep; 