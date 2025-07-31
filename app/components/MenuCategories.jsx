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
  const [useScrollFallback, setUseScrollFallback] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  // Detect reduced motion preference and device capabilities
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addListener(handleChange);

    // Also check for older/low-end devices based on user agent
    const isOlderDevice = /Android [1-6]\.|iPhone OS [1-9]_|iPad.*OS [1-9]_/.test(navigator.userAgent);
    if (isOlderDevice) {
      setPrefersReducedMotion(true);
    }

    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Enhanced fallback scroll handler that works for both directions
  const handleScrollFallback = () => {
    if (!useScrollFallback) return;
    
    let bestCategory = "";
    let bestScore = -1;
    
    // Define our target area (where we want to detect active sections)
    const targetTop = 200; // Top of our detection zone
    const targetBottom = window.innerHeight * 0.6; // Bottom of our detection zone
    
    Object.entries(categoryRefs.current).forEach(([categoryValue, ref]) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const sectionTop = rect.top;
        const sectionBottom = rect.bottom;
        
        // Calculate how much of the section is in our target area
        let visibilityScore = 0;
        
        if (sectionTop <= targetTop && sectionBottom >= targetTop) {
          // Section starts above target and extends into it
          visibilityScore = Math.min(sectionBottom - targetTop, targetBottom - targetTop) / (targetBottom - targetTop);
        } else if (sectionTop >= targetTop && sectionTop <= targetBottom) {
          // Section starts within target area
          const visibleHeight = Math.min(sectionBottom, targetBottom) - sectionTop;
          const targetHeight = targetBottom - targetTop;
          visibilityScore = visibleHeight / targetHeight;
        }
        
        // Boost score for sections that are well-positioned
        if (sectionTop <= targetTop + 50 && sectionBottom >= targetTop + 50) {
          visibilityScore += 0.3; // Bonus for sections crossing our sweet spot
        }
        
        if (visibilityScore > bestScore) {
          bestScore = visibilityScore;
          bestCategory = categoryValue;
        }
      }
    });
    
    if (bestCategory && bestScore > 0.1) { // Only update if we have a clear winner
      setActiveCategory(bestCategory);
    }
  };

  // Set up intersection observer to track active category
  useEffect(() => {
    if (uniqueCategories.length === 0) return;
    
    // Set initial active category
    setActiveCategory(uniqueCategories[0]?.value || "");

    // Check if IntersectionObserver is supported and working properly
    if (!window.IntersectionObserver) {
      setUseScrollFallback(true);
      return;
    }

    let observer;
    let lastActiveCategory = "";
    let monitorScrolling;
    let timeoutId;
    
    try {
      // Use a simpler, more reliable IntersectionObserver configuration
      observer = new IntersectionObserver(
        (entries) => {
          requestAnimationFrame(() => {
            // Find the most visible section instead of just the first intersecting one
            let mostVisible = null;
            let maxRatio = 0;
            
            entries.forEach((entry) => {
              const categoryValue = entry.target.getAttribute('data-category');
              if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                maxRatio = entry.intersectionRatio;
                mostVisible = categoryValue;
              }
            });
            
            // If no section is intersecting well, keep the last active one for stability
            if (mostVisible) {
              lastActiveCategory = mostVisible;
              setActiveCategory(mostVisible);
            } else if (!entries.some(e => e.isIntersecting) && lastActiveCategory) {
              // If we're between sections, don't change the active category
              // This helps with upward scrolling stability
            }
          });
        },
        {
          // Simpler rootMargin that works better with upward scrolling
          rootMargin: '-150px 0px -50% 0px',
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] // Multiple thresholds for better detection
        }
      );

      // Observe all category sections
      Object.values(categoryRefs.current).forEach((ref) => {
        if (ref) observer.observe(ref);
      });
      
      // Smart fallback detection: monitor for upward scroll issues
      let lastScrollY = window.scrollY;
      let noUpdateCount = 0;
      
      monitorScrolling = () => {
        const currentScrollY = window.scrollY;
        const isScrollingUp = currentScrollY < lastScrollY;
        
        // If we're scrolling up significantly but the active category hasn't changed,
        // IntersectionObserver might be failing
        if (isScrollingUp && Math.abs(currentScrollY - lastScrollY) > 100) {
          noUpdateCount++;
          if (noUpdateCount > 3) { // After 3 instances of no updates while scrolling up
            console.warn('IntersectionObserver failing on upward scroll, switching to fallback');
            setUseScrollFallback(true);
            if (observer) observer.disconnect();
            window.removeEventListener('scroll', monitorScrolling);
            return;
          }
        } else {
          noUpdateCount = 0; // Reset counter on successful updates or downward scroll
        }
        
        lastScrollY = currentScrollY;
      };
      
      // Monitor scrolling behavior
      window.addEventListener('scroll', monitorScrolling, { passive: true });
      
      // Also set a timeout as backup
      timeoutId = setTimeout(() => {
        window.removeEventListener('scroll', monitorScrolling);
      }, 10000); // Stop monitoring after 10 seconds
      
    } catch (error) {
      // Fallback if IntersectionObserver fails
      console.warn('IntersectionObserver failed, using scroll fallback:', error);
      setUseScrollFallback(true);
    }

    return () => {
      if (observer) observer.disconnect();
      // Clean up monitoring if it's still active
      if (monitorScrolling) {
        window.removeEventListener('scroll', monitorScrolling);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [uniqueCategories]);

  // Add scroll listener for fallback with direction detection
  useEffect(() => {
    if (!useScrollFallback) return;

    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollY;
      lastScrollY = currentScrollY;
      
      // Use more frequent updates when scrolling up (where the issue occurs)
      const throttleDelay = isScrollingUp ? 50 : 100;
      
      clearTimeout(handleScroll.timeoutId);
      handleScroll.timeoutId = setTimeout(handleScrollFallback, throttleDelay);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(handleScroll.timeoutId);
    };
  }, [useScrollFallback]);



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
