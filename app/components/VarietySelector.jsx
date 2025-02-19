import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const VarietySelector = ({ totalSandwiches, formData, updateFormData }) => {
  // Track which fields have been manually set
  const [touchedFields, setTouchedFields] = useState({
    nonVega: false,
    vega: false,
    vegan: false,
  });

  const handleChange = (field, value) => {
    const numValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);

    // Mark this field as touched
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    // Get current values
    const currentValues = {
      nonVega: formData.varietySelection.nonVega || 0,
      vega: formData.varietySelection.vega || 0,
      vegan: formData.varietySelection.vegan || 0,
      [field]: numValue,
    };

    // Count touched fields and find the untouched one
    const touchedCount = Object.values(touchedFields).filter(Boolean).length;
    const untouchedField = Object.keys(touchedFields).find(
      (key) => !touchedFields[key]
    );

    // If exactly one field is untouched, calculate its value
    if (touchedCount === 2 && untouchedField) {
      const sum = Object.entries(currentValues)
        .filter(([key]) => key !== untouchedField)
        .reduce((acc, [_, val]) => acc + val, 0);

      const remaining = totalSandwiches - sum;
      currentValues[untouchedField] = Math.max(0, remaining);
    }

    updateFormData("varietySelection", currentValues);
  };

  // Calculate remaining sandwiches
  const currentTotal =
    (formData.varietySelection.nonVega || 0) +
    (formData.varietySelection.vega || 0) +
    (formData.varietySelection.vegan || 0);
  const remaining = totalSandwiches - currentTotal;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Kip, Vlees, Vis</Label>
          <div className="flex gap-4 items-center mt-1">
            <Input
              type="number"
              min="0"
              max={totalSandwiches}
              value={formData.varietySelection.nonVega || ""}
              onChange={(e) => handleChange("nonVega", e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-gray-500">broodjes</span>
          </div>
        </div>

        <div>
          <Label>Vegetarisch</Label>
          <div className="flex gap-4 items-center mt-1">
            <Input
              type="number"
              min="0"
              max={totalSandwiches}
              value={formData.varietySelection.vega || ""}
              onChange={(e) => handleChange("vega", e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-gray-500">broodjes</span>
          </div>
        </div>

        <div>
          <Label>Vegan</Label>
          <div className="flex gap-4 items-center mt-1">
            <Input
              type="number"
              min="0"
              max={totalSandwiches}
              value={formData.varietySelection.vegan || ""}
              onChange={(e) => handleChange("vegan", e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-gray-500">broodjes</span>
          </div>
        </div>
      </div>

      <div
        className={`p-4 rounded-md ${
          remaining === 0 ? "bg-green-50" : "bg-blue-50"
        }`}
      >
        {remaining === 0 ? (
          <p className="text-green-700">
            Alle {totalSandwiches} broodjes zijn verdeeld
          </p>
        ) : (
          <p className="text-blue-700">Nog {remaining} broodjes te verdelen</p>
        )}
      </div>

      {currentTotal > totalSandwiches && (
        <div className="p-4 rounded-md bg-red-50">
          <p className="text-red-700">
            U heeft {currentTotal - totalSandwiches} broodjes te veel
            geselecteerd
          </p>
        </div>
      )}

      {/* Price calculation */}
      <div className="border-t pt-4 mt-4">
        <div className="bg-gray-50 p-4 rounded-md space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Prijs per broodje</span>
            <span>€5,50</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Aantal broodjes</span>
            <span>{currentTotal}</span>
          </div>
          <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
            <span>Totaalbedrag</span>
            <span>€{(currentTotal * 5.5).toFixed(2)} excl. BTW</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VarietySelector;
