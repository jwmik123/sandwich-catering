import React, { useMemo } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SelectionManager from "./SelectionManager";
import { urlFor } from "@/sanity/lib/image";
import SelectedSandwichesList from "./SelectedSandwichesList";
import { breadTypes } from "@/app/assets/constants";

const MenuCategories = ({ sandwichOptions, formData, updateFormData }) => {
  if (!Array.isArray(sandwichOptions) || !formData || !updateFormData) {
    return <div className="p-4 text-red-600">Missing required props</div>;
  }

  // Get categories in the specified order
  const uniqueCategories = useMemo(() => {
    const categoryNames = {
      specials: "Specials",
      basics: "Basics",
      croissants: "Croissants",
      zoetigheden: "Zoetigheden",
      dranken: "Dranken",
    };

    // Get all categories that exist in the data
    const existingCategories = new Set(
      sandwichOptions.map((item) => item.category)
    );

    // Filter categoryNames to only include categories that exist in the data
    return Object.entries(categoryNames)
      .filter(([key]) => existingCategories.has(key))
      .map(([key, name]) => ({
        id: key,
        name: name,
        value: key,
      }));
  }, [sandwichOptions]);

  const handleRemoveSelection = (sandwichId, indexToRemove) => {
    const currentSelections = formData.customSelection[sandwichId] || [];
    const updatedSelections = currentSelections.filter(
      (_, index) => index !== indexToRemove
    );
    updateFormData("customSelection", {
      ...formData.customSelection,
      [sandwichId]: updatedSelections,
    });
  };

  return (
    <div className="w-full">
      <Tabs defaultValue={uniqueCategories[0]?.value} className="w-full">
        <TabsList className="w-full grid grid-cols-5 gap-4">
          {uniqueCategories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.value}
              className="w-full"
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {uniqueCategories.map((category) => (
          <TabsContent
            key={category.id}
            value={category.value}
            className="mt-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sandwichOptions
                .filter((item) => item.category === category.value)
                .map((item) => (
                  <div key={item._id} className="relative">
                    {/* this is the card for each sandwich */}
                    {console.log(item)}
                    <div
                      key={item._id}
                      className="shadow-md p-4 relative flex justify-between gap-4 min-h-44"
                    >
                      <div className="w-1/2">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-bold text-lg">{item.name}</h3>
                          <p className="text-sm text-gray-500">
                            {item.description}
                          </p>
                          <p className="text-sm font-medium text-gray-500 mt-1">
                            €{item.price.toFixed(2)}
                          </p>
                          {item.dietaryType && (
                            <div className="text-xs font-medium rounded mt-2 text-gray-800">
                              <span className="bg-gray-100 px-2 py-1">
                                {item.dietaryType}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-1/2 relative -m-4">
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${urlFor(item.image).url()})`,
                          }}
                        />
                      </div>
                    </div>
                    <SelectionManager
                      sandwich={item}
                      formData={formData}
                      updateFormData={updateFormData}
                      totalAllowed={formData.totalSandwiches}
                    />
                  </div>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      {/* Add the selected sandwiches list */}
      <SelectedSandwichesList
        selections={formData.customSelection}
        sandwichOptions={sandwichOptions}
        onRemove={handleRemoveSelection}
        breadTypes={breadTypes}
      />
    </div>
  );
};

export default MenuCategories;
