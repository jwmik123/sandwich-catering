"use client";
import React from "react";
import { Utensils } from "lucide-react";
import MenuCategories from "@/app/components/MenuCategories";
import VarietySelector from "@/app/components/VarietySelector";

const SelectionTypeStep = ({ formData, updateFormData, sandwichOptions }) => {
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="addDrinks"
                  checked={formData.addDrinks || false}
                  onChange={(e) => updateFormData("addDrinks", e.target.checked)}
                  className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black focus:ring-2"
                />
                <label htmlFor="addDrinks" className="text-lg font-medium text-gray-900 cursor-pointer">
                  Want to add some drinks?
                </label>
              </div>
              
              {formData.addDrinks && (
                <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-md font-medium text-gray-800">Select Drinks</h4>
                  
                  {/* Verse Jus */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Verse Jus</label>
                      <div className="text-xs text-gray-500">€3.62 each</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.drinks?.verseJus || 0;
                          const newAmount = Math.max(0, current - 1);
                          updateFormData("drinks", {
                            ...formData.drinks,
                            verseJus: newAmount
                          });
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        disabled={!formData.drinks?.verseJus || formData.drinks?.verseJus <= 0}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">
                        {formData.drinks?.verseJus || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.drinks?.verseJus || 0;
                          updateFormData("drinks", {
                            ...formData.drinks,
                            verseJus: current + 1
                          });
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Sodas */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Sodas</label>
                      <div className="text-xs text-gray-500">€2.71 each</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.drinks?.sodas || 0;
                          const newAmount = Math.max(0, current - 1);
                          updateFormData("drinks", {
                            ...formData.drinks,
                            sodas: newAmount
                          });
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        disabled={!formData.drinks?.sodas || formData.drinks?.sodas <= 0}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">
                        {formData.drinks?.sodas || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.drinks?.sodas || 0;
                          updateFormData("drinks", {
                            ...formData.drinks,
                            sodas: current + 1
                          });
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Smoothies */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Smoothies</label>
                      <div className="text-xs text-gray-500">€3.62 each</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.drinks?.smoothies || 0;
                          const newAmount = Math.max(0, current - 1);
                          updateFormData("drinks", {
                            ...formData.drinks,
                            smoothies: newAmount
                          });
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        disabled={!formData.drinks?.smoothies || formData.drinks?.smoothies <= 0}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">
                        {formData.drinks?.smoothies || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = formData.drinks?.smoothies || 0;
                          updateFormData("drinks", {
                            ...formData.drinks,
                            smoothies: current + 1
                          });
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* Total drinks summary */}
                  {(formData.drinks?.verseJus > 0 || formData.drinks?.sodas > 0 || formData.drinks?.smoothies > 0) && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Total drinks: {(formData.drinks?.verseJus || 0) + (formData.drinks?.sodas || 0) + (formData.drinks?.smoothies || 0)}
                        </span>
                        <span className="font-medium text-gray-800">
                          €{(
                            (formData.drinks?.verseJus || 0) * 3.62 +
                            (formData.drinks?.sodas || 0) * 2.71 +
                            (formData.drinks?.smoothies || 0) * 3.62
                          ).toFixed(2)} excl. VAT
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Total amount calculation - full width */}
          <div className="pt-4 mt-6 border-t">
            <div className="p-4 space-y-2 rounded-md bg-custom-gray/10">
              <div className="flex justify-between text-sm text-custom-gray">
                <span>Price per sandwich</span>
                <span>€6,83</span>
              </div>
              <div className="flex justify-between text-sm text-custom-gray">
                <span>Number of sandwiches</span>
                <span>{formData.totalSandwiches}</span>
              </div>
              {formData.addDrinks && (formData.drinks?.verseJus > 0 || formData.drinks?.sodas > 0 || formData.drinks?.smoothies > 0) && (
                <>
                  <div className="flex justify-between text-sm text-custom-gray">
                    <span>Drinks total</span>
                    <span>
                      €{(
                        (formData.drinks?.verseJus || 0) * 3.62 +
                        (formData.drinks?.sodas || 0) * 2.71 +
                        (formData.drinks?.smoothies || 0) * 3.62
                      ).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 font-medium border-t text-custom-gray">
                <span>Total amount</span>
                <span>
                  €{(
                    formData.totalSandwiches * 6.83 + 
                    (formData.addDrinks && formData.drinks ? 
                      (formData.drinks.verseJus || 0) * 3.62 +
                      (formData.drinks.sodas || 0) * 2.71 +
                      (formData.drinks.smoothies || 0) * 3.62 
                      : 0)
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