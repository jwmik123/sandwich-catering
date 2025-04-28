import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const VarietySelector = ({ totalSandwiches, formData, updateFormData }) => {
  const [selectedTypes, setSelectedTypes] = useState({
    nonVega: false,
    vega: false,
    vegan: false,
  });

  const [suggestedDistribution, setSuggestedDistribution] = useState({
    nonVega: 0,
    vega: 0,
    vegan: 0,
  });

  // Calculate suggested distributions when selections change
  useEffect(() => {
    const selectedCount = Object.values(selectedTypes).filter(Boolean).length;
    if (selectedCount === 0) {
      setSuggestedDistribution({
        nonVega: 0,
        vega: 0,
        vegan: 0,
      });
      return;
    }

    const portionSize = Math.floor(totalSandwiches / selectedCount);
    const remainder = totalSandwiches % selectedCount;

    const newDistribution = {
      nonVega: selectedTypes.nonVega ? portionSize : 0,
      vega: selectedTypes.vega ? portionSize : 0,
      vegan: selectedTypes.vegan ? portionSize : 0,
    };

    // Distribute remainder if any
    if (remainder > 0) {
      Object.keys(selectedTypes).forEach((type, index) => {
        if (selectedTypes[type] && index < remainder) {
          newDistribution[type] += 1;
        }
      });
    }

    setSuggestedDistribution(newDistribution);

    // Update the actual form values with the suggested distribution
    updateFormData("varietySelection", newDistribution);
  }, [selectedTypes, totalSandwiches]);

  const handleCheckChange = (type, checked) => {
    const newSelectedTypes = {
      ...selectedTypes,
      [type]: checked,
    };
    setSelectedTypes(newSelectedTypes);
  };

  const handleInputChange = (field, value) => {
    const numValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
    updateFormData("varietySelection", {
      ...formData.varietySelection,
      [field]: numValue,
    });
  };

  const currentTotal = Object.values(formData.varietySelection).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col">
            <Label htmlFor="nonVega" className="font-bold text-base">
              Chicken, Meat, Fish
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nonVega"
                checked={selectedTypes.nonVega}
                onCheckedChange={(checked) =>
                  handleCheckChange("nonVega", checked)
                }
              />
              <div className="flex-1">
                <div className="flex items-center mt-2">
                  <Input
                    type="number"
                    value={formData.varietySelection.nonVega || ""}
                    onChange={(e) =>
                      handleInputChange("nonVega", e.target.value)
                    }
                    className="w-24"
                    min="0"
                    max={totalSandwiches}
                  />
                  <span className="ml-2 text-sm text-custom-gray">
                    sandwiches
                  </span>
                  {selectedTypes.nonVega &&
                    suggestedDistribution.nonVega > 0 && (
                      <span className="ml-2 text-sm text-blue-600">
                        (Suggested: {suggestedDistribution.nonVega})
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <Label htmlFor="vega" className="font-bold text-base">
              Vegetarian
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vega"
                checked={selectedTypes.vega}
                onCheckedChange={(checked) =>
                  handleCheckChange("vega", checked)
                }
              />
              <div className="flex-1">
                <div className="flex items-center mt-2">
                  <Input
                    type="number"
                    value={formData.varietySelection.vega || ""}
                    onChange={(e) => handleInputChange("vega", e.target.value)}
                    className="w-24"
                    min="0"
                    max={totalSandwiches}
                  />
                  <span className="ml-2 text-sm text-custom-gray">
                    sandwiches
                  </span>
                  {selectedTypes.vega && suggestedDistribution.vega > 0 && (
                    <span className="ml-2 text-sm text-blue-600">
                      (Voorgesteld: {suggestedDistribution.vega})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <Label htmlFor="vegan" className="font-bold text-base">
              Vegan
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vegan"
                checked={selectedTypes.vegan}
                onCheckedChange={(checked) =>
                  handleCheckChange("vegan", checked)
                }
              />
              <div className="flex-1">
                <div className="flex items-center mt-2">
                  <Input
                    type="number"
                    value={formData.varietySelection.vegan || ""}
                    onChange={(e) => handleInputChange("vegan", e.target.value)}
                    className="w-24"
                    min="0"
                    max={totalSandwiches}
                  />
                  <span className="ml-2 text-sm text-custom-gray">
                    sandwiches
                  </span>
                  {selectedTypes.vegan && suggestedDistribution.vegan > 0 && (
                    <span className="ml-2 text-sm text-blue-600">
                      (Voorgesteld: {suggestedDistribution.vegan})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`p-4 rounded-md ${
          currentTotal === totalSandwiches
            ? "bg-green-50"
            : currentTotal > totalSandwiches
              ? "bg-red-50"
              : "bg-blue-50"
        }`}
      >
        {currentTotal === totalSandwiches ? (
          <p className="text-green-700">
            All {totalSandwiches} sandwiches are distributed
          </p>
        ) : currentTotal > totalSandwiches ? (
          <p className="text-red-700">
            You have {currentTotal - totalSandwiches} sandwiches too many
          </p>
        ) : (
          <p className="text-blue-700">
            You have {totalSandwiches - currentTotal} sandwiches to distribute
          </p>
        )}
      </div>

      {/* Price calculation */}
      <div className="border-t pt-4 mt-4">
        <div className="bg-custom-gray/10 p-4 rounded-md space-y-2">
          <div className="flex justify-between text-sm text-custom-gray">
            <span>Price per sandwich</span>
            <span>€6,38</span>
          </div>
          <div className="flex justify-between text-sm text-custom-gray">
            <span>Number of sandwiches</span>
            <span>{currentTotal}</span>
          </div>
          <div className="flex justify-between font-medium text-custom-gray pt-2 border-t">
            <span>Total amount</span>
            <span>€{(currentTotal * 6.38).toFixed(2)} excl. VAT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VarietySelector;
