"use client";
import React from "react";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const SandwichAmountStep = ({ formData, updateFormData }) => {
  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex gap-2 items-center text-lg font-medium text-custom-gray">
        <Users className="w-5 h-5" />
        <h2 className="text-gray-700">Amount of sandwiches</h2>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-row w-full md:w-1/2">
          {/* Number of People section */}
          <div className="w-full">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="mb-4 w-full">
                <Label htmlFor="peopleSelect">
                  How many sandwiches would you like?
                </Label>
                <Select
                  value={formData.totalSandwiches.toString()}
                  onValueChange={(value) =>
                    updateFormData("totalSandwiches", value)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select number of sandwiches" />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 50, 100, 200, 300, 500].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} sandwiches
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-8 w-full">
                <Label htmlFor="peopleInput">Or enter a specific number:</Label>
                <Input
                  id="peopleInput"
                  type="number"
                  min="1"
                  value={formData.totalSandwiches}
                  onChange={(e) =>
                    updateFormData("totalSandwiches", e.target.value)
                  }
                  className="mt-1"
                  placeholder="Enter number of sandwiches"
                />
              </div>
            </div>

            <div className="w-full">
              <div className="space-y-6">
                <div className="p-4 text-sm text-green-500 bg-green-50 rounded-md bg-beige-50">
                  <p>* We recommend 2 sandwiches per person</p>
                  <p>* Minimum 15 sandwiches</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-6 w-full rounded-lg bg-custom-gray/10 md:w-1/2">
          <h3 className="mb-4 text-lg font-medium text-custom-gray">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-sm text-custom-gray">
                Total number of sandwiches
              </p>
              <p className="text-lg font-medium">{formData.totalSandwiches}</p>
              {formData.totalSandwiches < 15 &&
                formData.totalSandwiches > 0 && (
                  <p className="mt-1 text-sm text-red-600">
                    * Minimum 15 sandwiches
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SandwichAmountStep; 