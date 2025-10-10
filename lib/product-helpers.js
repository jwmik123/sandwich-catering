// Helper functions for product type checking and calculations

// Check if product should have bread type selection (only sandwiches)
export const shouldHaveBreadType = (product) => {
  if (!product?.category) return false;

  // Check if category slug is either 'specials' or 'basics'
  const categorySlug = product.category.slug?.current || product.category.slug || product.category;
  return categorySlug === "specials" || categorySlug === "basics";
};

// Check if product is a drink/non-sandwich item
export const isDrink = (product) => {
  return !shouldHaveBreadType(product);
};

export const calculateRemainingQuantity = (formData, totalAllowed) => {
  if (!formData.customSelection) return totalAllowed;

  // Only count non-drink items towards the total
  return (
    totalAllowed -
    Object.entries(formData.customSelection).reduce(
      (sum, [sandwichId, selections]) => {
        // Find the product in sandwichOptions to check if it's a drink
        const product = formData.sandwichOptions?.find(
          (s) => s._id === sandwichId
        );
        if (!product || isDrink(product)) return sum;

        // Sum up quantities for non-drink items
        return (
          sum +
          selections.reduce((total, selection) => total + selection.quantity, 0)
        );
      },
      0
    )
  );
};

export const getTotalSelectedItems = (formData) => {
  if (!formData.customSelection) return 0;

  return Object.entries(formData.customSelection).reduce(
    (sum, [sandwichId, selections]) => {
      // Find the product to check if it's a drink
      const product = formData.sandwichOptions?.find(
        (s) => s._id === sandwichId
      );
      if (!product || isDrink(product)) return sum;

      // Sum up quantities for non-drink items
      return (
        sum +
        selections.reduce((total, selection) => total + selection.quantity, 0)
      );
    },
    0
  );
};

export const getTotalSelectedDrinks = (formData) => {
  if (!formData.customSelection) return 0;

  return Object.entries(formData.customSelection).reduce(
    (sum, [sandwichId, selections]) => {
      // Find the product to check if it's a drink
      const product = formData.sandwichOptions?.find(
        (s) => s._id === sandwichId
      );
      if (!product || !isDrink(product)) return sum;

      // Sum up quantities for drink items
      return (
        sum +
        selections.reduce((total, selection) => total + selection.quantity, 0)
      );
    },
    0
  );
};
