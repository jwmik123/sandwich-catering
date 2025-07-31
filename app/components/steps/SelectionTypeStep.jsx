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
          <div className="mt-6 space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              Choose a distribution
            </h3>
            <VarietySelector
              totalSandwiches={formData.totalSandwiches}
              formData={formData}
              updateFormData={updateFormData}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SelectionTypeStep; 