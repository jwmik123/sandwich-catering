import React, { useMemo } from "react";
import { Tab } from "@headlessui/react";
import Image from "next/image";
import SelectionManager from "./SelectionManager";
import { urlFor } from "@/sanity/lib/image";

const MenuCategories = ({ sandwichOptions, formData, updateFormData }) => {
  if (!Array.isArray(sandwichOptions) || !formData || !updateFormData) {
    return <div className="p-4 text-red-600">Missing required props</div>;
  }

  // Get unique categories while preserving all items
  const uniqueCategories = useMemo(() => {
    const categoryNames = {
      specials: "Specials",
      basics: "Basics",
      croissants: "Croissants",
      zoetigheden: "Zoetigheden",
      frisdranken: "Frisdranken",
    };

    const categories = [
      ...new Set(sandwichOptions.map((item) => item.category)),
    ];

    return categories.map((category) => ({
      id: category,
      name: categoryNames[category] || category,
      value: category,
    }));
  }, [sandwichOptions]);

  return (
    <div className="w-full">
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          {uniqueCategories.map((category) => (
            <Tab
              key={category.id}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                ${
                  selected
                    ? "bg-white text-blue-700 shadow"
                    : "text-gray-600 hover:bg-white/[0.12] hover:text-blue-600"
                }`
              }
            >
              {category.name}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-4">
          {uniqueCategories.map((category) => (
            <Tab.Panel
              key={category.id}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {sandwichOptions
                .filter((item) => item.category === category.value)
                .map((item) => (
                  <div
                    key={item._id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <Image
                          src={urlFor(item.image).url()}
                          alt={item.name}
                          width={100}
                          height={100}
                        />
                        <p className="text-sm text-gray-500">
                          {item.description}
                        </p>
                        <p className="text-sm font-medium text-blue-600 mt-1">
                          €{item.price.toFixed(2)}
                        </p>
                        {item.dietaryType && (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded mt-2 bg-gray-100 text-gray-800">
                            {item.dietaryType}
                          </span>
                        )}
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
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default MenuCategories;
