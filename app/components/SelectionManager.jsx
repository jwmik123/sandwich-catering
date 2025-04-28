import React, { useState } from "react";
import SelectionModal from "./SelectionModal";
import { isDrink, calculateRemainingQuantity } from "@/lib/product-helpers";

const SelectionManager = ({
  sandwich,
  formData,
  updateFormData,
  totalAllowed,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const sandwichId = sandwich._id;
  const currentSelections = formData.customSelection[sandwichId] || [];

  // Only calculate remaining quantity for non-drinks
  const remainingQuantity = isDrink(sandwich)
    ? 999 // arbitrary high number for drinks
    : calculateRemainingQuantity(formData, totalAllowed);

  const handleAddSelection = (newSelection) => {
    const updatedSelections = [...currentSelections, newSelection];
    updateFormData("customSelection", {
      ...formData.customSelection,
      [sandwichId]: updatedSelections,
    });
  };

  return (
    <div className="absolute bottom-2 right-2">
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={!isDrink(sandwich) && remainingQuantity === 0}
        className="px-3 py-1 rounded-md font-medium bg-muted text-muted-foreground
          hover:bg-muted/90 focus:outline-none focus:ring-2
          focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
      >
        +
      </button>
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
