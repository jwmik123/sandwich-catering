import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle } from "lucide-react";

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
      <div className="relative group">
        <div className="absolute top-0 right-0 p-2 transition-colors rounded-full hover:bg-blue-50">
          <HelpCircle className="w-5 h-5 text-blue-600" />
        </div>
        <div className="absolute right-0 z-10 invisible w-64 p-4 mt-2 transition-all duration-200 bg-white rounded-lg shadow-lg opacity-0 top-full group-hover:opacity-100 group-hover:visible">
          <p className="text-sm text-gray-700">
            Our variety offer lets you choose the distribution of sandwich
            types. We'll select the best sandwiches from each category to create
            a balanced and delicious selection for you.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col">
            <Label htmlFor="nonVega" className="text-base font-bold">
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
            <Label htmlFor="vega" className="text-base font-bold">
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
                      (Suggested: {suggestedDistribution.vega})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <Label htmlFor="vegan" className="text-base font-bold">
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
                      (Suggested: {suggestedDistribution.vegan})
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
            Perfect! All {totalSandwiches} sandwiches are distributed
          </p>
        ) : currentTotal > totalSandwiches ? (
          <p className="text-red-700">
            You have {currentTotal - totalSandwiches} sandwiches too many.
            Please adjust the numbers.
          </p>
        ) : (
          <p className="text-blue-700">
            You still have {totalSandwiches - currentTotal} sandwiches to
            distribute
          </p>
        )}
      </div>


    </div>
  );
};

export default VarietySelector;
