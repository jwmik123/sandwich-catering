import React, { useMemo, useRef, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SelectionManager from "./SelectionManager";
import { urlFor } from "@/sanity/lib/image";
import SelectedSandwichesList from "./SelectedSandwichesList";
import { breadTypes } from "@/app/assets/constants";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const MenuCategories = ({ sandwichOptions, formData, updateFormData }) => {
  const categoryRefs = useRef({});
  const buttonRefs = useRef({});
  const [activeCategory, setActiveCategory] = useState("");
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const scrollTriggersRef = useRef([]);

  if (!Array.isArray(sandwichOptions) || !formData || !updateFormData) {
    return <div className="p-4 text-red-600">Missing required props</div>;
  }

  // Get categories in the specified order
  const uniqueCategories = useMemo(() => {
    const categoryNames = {
      specials: "Specials",
      basics: "Basics",
      croissants: "Breakfast",
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

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addListener(handleChange);

    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Set initial active category only once
  useEffect(() => {
    if (uniqueCategories.length > 0 && !activeCategory) {
      setActiveCategory(uniqueCategories[0]?.value || "");
    }
  }, [uniqueCategories, activeCategory]);

  // Set up GSAP ScrollTriggers for category detection
  useEffect(() => {
    if (uniqueCategories.length === 0) return;

    // Clean up existing triggers
    scrollTriggersRef.current.forEach(trigger => trigger.kill());
    scrollTriggersRef.current = [];

    // Create ScrollTrigger for each category
    uniqueCategories.forEach((category) => {
      const element = categoryRefs.current[category.value];
      if (element) {
        const trigger = ScrollTrigger.create({
          trigger: element,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: () => {
            if (!isManualScrolling) {
              setActiveCategory(category.value);
            }
          },
          onEnterBack: () => {
            if (!isManualScrolling) {
              setActiveCategory(category.value);
            }
          },
        });
        
        scrollTriggersRef.current.push(trigger);
      }
    });

    return () => {
      // Cleanup ScrollTriggers
      scrollTriggersRef.current.forEach(trigger => trigger.kill());
      scrollTriggersRef.current = [];
    };
  }, [uniqueCategories]);

  // Cleanup GSAP animations on unmount
  useEffect(() => {
    return () => {
      gsap.killTweensOf(window);
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);



  // Update indicator position when active category changes or window resizes
  useEffect(() => {
    const updateIndicatorPosition = () => {
      const activeButton = buttonRefs.current[activeCategory];
      if (activeButton) {
        try {
          const container = activeButton.parentElement;
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          
          setIndicatorStyle({
            left: buttonRect.left - containerRect.left,
            width: buttonRect.width,
            height: buttonRect.height,
            top: buttonRect.top - containerRect.top,
          });
        } catch (error) {
          // Silently handle position calculation errors on older browsers
          console.warn('Position calculation failed:', error);
        }
      }
    };

    if (activeCategory) {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        setTimeout(updateIndicatorPosition, 50);
      });
    }

    // Throttled resize handler for better performance
    let resizeTimeout;
    const handleResize = () => {
      if (activeCategory) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          requestAnimationFrame(updateIndicatorPosition);
        }, 150);
      }
    };

    window.addEventListener('resize', handleResize);
    
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
    // Immediately set the active category and disable automatic tracking
    setActiveCategory(categoryValue);
    setIsManualScrolling(true);
    
    // Use native browser scrolling with ID
    const element = document.getElementById(`category-${categoryValue}`);
    if (element) {
      element.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    }
    
    // Re-enable automatic tracking after scroll completes
    setTimeout(() => {
      setIsManualScrolling(false);
    }, 1000); // Longer delay for smooth scroll to complete
  };

  return (
    <div className="w-full">
      {/* Navigation tabs */}
      <div className="sticky top-32 z-10 bg-primary rounded-md text-white">
        <div className="relative grid w-full grid-cols-5 gap-1 sm:gap-2 md:gap-4 px-2 py-3 sm:px-3 sm:py-2 md:px-4 md:py-2">
          {/* Sliding indicator - optimized for older devices */}
          <div 
            className={`absolute bg-white rounded-md ${
              prefersReducedMotion 
                ? '' 
                : 'transition-transform duration-300 ease-out'
            }`}
            style={{
              ...indicatorStyle,
              willChange: !prefersReducedMotion && activeCategory ? 'transform' : 'auto',
              transform: `translateX(${indicatorStyle.left || 0}px)`,
              width: indicatorStyle.width,
              height: indicatorStyle.height,
              top: indicatorStyle.top,
              left: 0, // Reset left since we're using translateX
            }}
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
            id={`category-${category.value}`}
            ref={(el) => (categoryRefs.current[category.value] = el)}
            data-category={category.value}
            className="scroll-mt-36 sm:scroll-mt-48"
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
