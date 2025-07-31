import React, { useMemo, useRef, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SelectionManager from "./SelectionManager";
import { urlFor } from "@/sanity/lib/image";
import SelectedSandwichesList from "./SelectedSandwichesList";
import { breadTypes } from "@/app/assets/constants";

const MenuCategories = ({ sandwichOptions, formData, updateFormData }) => {
  const categoryRefs = useRef({});
  const buttonRefs = useRef({});
  const [activeCategory, setActiveCategory] = useState("");
  const [indicatorStyle, setIndicatorStyle] = useState({});

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

  // Set up intersection observer to track active category
  useEffect(() => {
    if (uniqueCategories.length === 0) return;
    
    // Set initial active category
    setActiveCategory(uniqueCategories[0]?.value || "");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryValue = entry.target.getAttribute('data-category');
            if (categoryValue) {
              setActiveCategory(categoryValue);
            }
          }
        });
      },
      {
        rootMargin: '-200px 0px -70% 0px', // Trigger only after scrolling well past the title
        threshold: 0
      }
    );

    // Observe all category sections
    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [uniqueCategories]);

  // Update indicator position when active category changes or window resizes
  useEffect(() => {
    const updateIndicatorPosition = () => {
      const activeButton = buttonRefs.current[activeCategory];
      if (activeButton) {
        const container = activeButton.parentElement;
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
          height: buttonRect.height,
          top: buttonRect.top - containerRect.top,
        });
      }
    };

    if (activeCategory) {
      // Small delay to ensure DOM is updated
      setTimeout(updateIndicatorPosition, 50);
    }

    // Add resize listener to update position on window resize
    let resizeTimeout;
    const handleResize = () => {
      if (activeCategory) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateIndicatorPosition, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup event listener and timeout
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [activeCategory]);

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

  const scrollToCategory = (categoryValue) => {
    const element = categoryRefs.current[categoryValue];
    if (element) {
      element.scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
      });
    }
  };

  return (
    <div className="w-full">
      {/* Navigation tabs */}
      <div className="sticky top-32 z-10 bg-primary rounded-md text-white">
        <div className="relative grid w-full grid-cols-5 gap-1 sm:gap-2 md:gap-4 px-2 py-3 sm:px-3 sm:py-2 md:px-4 md:py-2">
          {/* Sliding indicator */}
          <div 
            className="absolute bg-white rounded-md transition-all duration-300 ease-in-out"
            style={indicatorStyle}
          />
          {uniqueCategories.map((category) => (
            <button
              key={category.id}
              ref={(el) => (buttonRefs.current[category.value] = el)}
              onClick={() => scrollToCategory(category.value)}
              className={`relative z-10 w-full px-1 py-2 sm:px-2 sm:py-1 md:px-4 md:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors outline-none ${
                activeCategory === category.value
                  ? "text-primary font-bold"
                  : "text-white hover:text-gray-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* All categories in one scrollable container */}
      <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 md:space-y-8">
        {uniqueCategories.map((category) => (
          <section
            key={category.id}
            ref={(el) => (categoryRefs.current[category.value] = el)}
            data-category={category.value}
            className="scroll-mt-48"
          >
            {/* Category title */}
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-foreground">
              {category.name}
            </h2>
            
            {/* Category items */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
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
          </section>
        ))}
      </div>

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
