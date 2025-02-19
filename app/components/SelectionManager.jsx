import React, { useState } from "react";
import SelectionModal from "./SelectionModal";
import { breadTypes } from "@/app/assets/constants";

const SelectionManager = ({
  sandwich,
  formData,
  updateFormData,
  totalAllowed,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use _id instead of id for Sanity documents
  const sandwichId = sandwich._id;

  // Get current selections for this sandwich
  const currentSelections = formData.customSelection[sandwichId] || [];

  // Calculate total quantity selected for this sandwich
  const totalSelected = currentSelections.reduce(
    (sum, selection) => sum + selection.quantity,
    0
  );

  // Calculate remaining quantity that can be selected
  const remainingQuantity =
    totalAllowed -
    Object.values(formData.customSelection)
      .flat()
      .reduce((sum, selection) => sum + selection.quantity, 0);

  const handleAddSelection = (newSelection) => {
    const updatedSelections = [...currentSelections, newSelection];
    updateFormData("customSelection", {
      ...formData.customSelection,
      [sandwichId]: updatedSelections,
    });
  };

  const handleRemoveSelection = (indexToRemove) => {
    const updatedSelections = currentSelections.filter(
      (_, index) => index !== indexToRemove
    );
    updateFormData("customSelection", {
      ...formData.customSelection,
      [sandwichId]: updatedSelections,
    });
  };

  // Function to get sauce name from selection
  const getSauceName = (sauceId) => {
    if (sauceId === "geen") return "";
    const sauceOption = sandwich.sauceOptions?.find(
      (sauce) => sauce.name === sauceId
    );
    return sauceOption ? ` met ${sauceOption.name}` : "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {currentSelections.map((selection, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <button
                onClick={() => handleRemoveSelection(index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
              {selection.quantity}x {sandwich.name} -{" "}
              {breadTypes.find((b) => b.id === selection.breadType)?.name}
              {getSauceName(selection.sauce)}
            </div>
          ))}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={remainingQuantity === 0}
          className="px-3 py-1 rounded-md font-medium bg-gray-100 text-gray-700
            hover:bg-gray-200 focus:outline-none focus:ring-2
            focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
        >
          +
        </button>
      </div>
      <SelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sandwich={sandwich}
        onAdd={handleAddSelection}
        remainingQuantity={remainingQuantity}
      />
    </div>
  );
};

export default SelectionManager;
