// Pricing and editing helpers for a "create your own" selection.
//
// formData.customSelection is keyed by product _id; each value is a list of
// variants ({ quantity, breadType, sauce, toppings, subTotal, ... }). The
// prices here follow SelectionModal exactly so a variant added with the +
// button is indistinguishable from one added through the modal.
import { breadTypes } from "@/app/assets/constants";
import { shouldHaveBreadType } from "@/lib/product-helpers";
import { round2 } from "@/lib/vat-calculations";

export const DEFAULT_SAUCE = "geen";

export const defaultBreadType = (product) =>
  shouldHaveBreadType(product) ? breadTypes[0].id : null;

export const selectionUnitPrice = (product, { breadType, sauce, toppings }) => {
  const breadSurcharge = breadType
    ? breadTypes.find((b) => b.id === breadType)?.surcharge || 0
    : 0;

  let sauceCost = 0;
  if (product?.hasSauceOptions && sauce && sauce !== DEFAULT_SAUCE) {
    sauceCost = product.sauceOptions?.find((s) => s.name === sauce)?.price || 0;
  }

  let toppingCost = 0;
  if (product?.hasToppings && toppings?.length > 0) {
    toppings.forEach((toppingName) => {
      toppingCost +=
        product.toppingOptions?.find((t) => t.name === toppingName)?.price || 0;
    });
  }

  return round2((product?.price || 0) + breadSurcharge + sauceCost + toppingCost);
};

export const selectionSubTotal = (product, selection) =>
  round2(selectionUnitPrice(product, selection) * selection.quantity);

// The variant the quick +/- buttons work on: default bread, no sauce, no toppings.
const isDefaultVariant = (product, selection) =>
  selection.breadType === defaultBreadType(product) &&
  (selection.sauce || DEFAULT_SAUCE) === DEFAULT_SAUCE &&
  (!selection.toppings || selection.toppings.length === 0);

export const productQuantity = (customSelection, productId) =>
  (customSelection?.[productId] || []).reduce((sum, s) => sum + s.quantity, 0);

/**
 * Set the total quantity of a product. Customised variants are kept as they
 * are; only the default variant grows or shrinks. When the new total is below
 * what the customised variants hold, those are trimmed from the end.
 */
export const setProductQuantity = (customSelection, product, quantity) => {
  const target = Math.max(0, Math.floor(Number(quantity) || 0));
  const variants = [...(customSelection?.[product._id] || [])];
  const defaultIndex = variants.findIndex((s) => isDefaultVariant(product, s));
  const customisedTotal = variants.reduce(
    (sum, s, i) => (i === defaultIndex ? sum : sum + s.quantity),
    0
  );

  let next;
  if (target >= customisedTotal) {
    const defaultQuantity = target - customisedTotal;
    next = variants.filter((_, i) => i !== defaultIndex);
    if (defaultQuantity > 0) {
      const base =
        defaultIndex >= 0
          ? variants[defaultIndex]
          : {
              // SelectionModal passes sandwich.id here; kept identical.
              sandwichId: product.id,
              breadType: defaultBreadType(product),
              sauce: DEFAULT_SAUCE,
              toppings: [],
            };
      const updated = { ...base, quantity: defaultQuantity };
      updated.subTotal = selectionSubTotal(product, updated);
      if (defaultIndex >= 0) next.splice(defaultIndex, 0, updated);
      else next.push(updated);
    }
  } else {
    // Drop the default variant, then trim customised variants from the end.
    let remaining = target;
    next = [];
    variants.forEach((s, i) => {
      if (i === defaultIndex || remaining <= 0) return;
      const quantity = Math.min(s.quantity, remaining);
      remaining -= quantity;
      next.push(
        quantity === s.quantity
          ? s
          : { ...s, quantity, subTotal: selectionSubTotal(product, { ...s, quantity }) }
      );
    });
  }

  return { ...customSelection, [product._id]: next };
};

/**
 * Re-price a saved selection against the current menu. Products that are no
 * longer on the menu are dropped.
 */
export const repriceCustomSelection = (customSelection, products) => {
  const result = {};
  Object.entries(customSelection || {}).forEach(([productId, variants]) => {
    const product = products.find((p) => p._id === productId);
    if (!product || !Array.isArray(variants)) return;
    const repriced = variants
      .filter((s) => s?.quantity > 0)
      .map((s) => ({ ...s, subTotal: selectionSubTotal(product, s) }));
    if (repriced.length > 0) result[productId] = repriced;
  });
  return result;
};

// Same count useOrderValidation uses for step 2 (every selected item).
export const countCustomItems = (customSelection) =>
  Object.values(customSelection || {})
    .flat()
    .reduce((total, selection) => total + selection.quantity, 0);

export const formatEuro = (value) => `€${(Number(value) || 0).toFixed(2)}`;
