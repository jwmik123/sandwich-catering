import React, { useMemo } from "react";
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
      zoetigheden: "Sweets",
      dranken: "Drinks",
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
        <TabsList className="grid w-full grid-cols-5 gap-4">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {sandwichOptions
                .filter((item) => item.category === category.value)
                .map((item) => (
                  <div key={item._id} className="relative">
                    {/* this is the card for each sandwich */}

                    <div
                      key={item._id}
                      className="relative flex justify-between gap-4 p-4 rounded-lg shadow-md min-h-44"
                    >
                      <div className="w-1/2">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-lg font-bold">{item.name}</h3>
                          <p className="text-sm">{item.description}</p>
                          <p className="mt-1 text-sm font-medium">
                            €{item.price.toFixed(2)}
                          </p>
                          {item.dietaryType && (
                            <div className="mt-2 text-xs font-medium rounded text-muted-foreground">
                              <span className="px-2 py-1 rounded-sm bg-muted">
                                {item.dietaryType}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="relative w-1/2 -m-4 overflow-hidden">
                        <div
                          className="absolute inset-0 bg-center bg-cover md:scale-125"
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
