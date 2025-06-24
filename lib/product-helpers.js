// Helper functions for product type checking and calculations
export const isDrink = (product) => {
  return (
    product.category === "dranken" ||
    product.category === "croissants" ||
    product.category === "zoetigheden"
  );
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
