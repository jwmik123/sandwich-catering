// "Order again": the last order placed in this browser, kept in localStorage.
//
// When an order is placed it is stored as pending under its quoteId; the
// confirmation page promotes it to the last order. Delivery date and time,
// reference number and one-off upsell addons are left out: those belong to a
// single order.
import { repriceCustomSelection } from "@/lib/selection-pricing";

const PENDING_PREFIX = "tsb_pending_order_";
const LAST_ORDER_KEY = "tsb_last_order";

const REORDER_FIELDS = [
  "totalSandwiches",
  "selectionType",
  "customSelection",
  "varietySelection",
  "drinks",
  "street",
  "houseNumber",
  "houseNumberAddition",
  "postalCode",
  "city",
  "sameAsDelivery",
  "invoiceStreet",
  "invoiceHouseNumber",
  "invoiceHouseNumberAddition",
  "invoicePostalCode",
  "invoiceCity",
  "name",
  "email",
  "invoiceEmail",
  "phoneNumber",
  "isCompany",
  "companyName",
  "companyVAT",
];

const read = (key) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const rememberPendingOrder = (quoteId, formData) => {
  if (typeof window === "undefined" || !quoteId) return;
  try {
    const order = { savedAt: new Date().toISOString() };
    REORDER_FIELDS.forEach((field) => {
      if (formData[field] !== undefined) order[field] = formData[field];
    });
    window.localStorage.setItem(`${PENDING_PREFIX}${quoteId}`, JSON.stringify(order));
  } catch (error) {
    console.warn("Could not remember the order for 'order again'", error);
  }
};

export const confirmPendingOrder = (quoteId) => {
  if (typeof window === "undefined" || !quoteId) return;
  const pending = read(`${PENDING_PREFIX}${quoteId}`);
  if (!pending) return;
  try {
    window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ ...pending, quoteId }));
    window.localStorage.removeItem(`${PENDING_PREFIX}${quoteId}`);
  } catch (error) {
    console.warn("Could not store the last order", error);
  }
};

export const getLastOrder = () => {
  if (typeof window === "undefined") return null;
  const order = read(LAST_ORDER_KEY);
  return order?.selectionType ? order : null;
};

export const forgetLastOrder = () => {
  try {
    window.localStorage.removeItem(LAST_ORDER_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
};

/**
 * Merge a saved order into the current form data, re-priced against today's
 * menu. Returns null when nothing of the order can be restored.
 */
export const buildReorderFormData = (lastOrder, formData, sandwichOptions) => {
  if (!lastOrder) return null;

  const restored = { ...formData };
  REORDER_FIELDS.forEach((field) => {
    if (lastOrder[field] !== undefined) restored[field] = lastOrder[field];
  });
  restored.deliveryDate = "";
  restored.deliveryTime = "";
  restored.referenceNumber = "";
  restored.upsellAddons = [];

  if (restored.selectionType === "custom") {
    restored.customSelection = repriceCustomSelection(
      lastOrder.customSelection,
      sandwichOptions
    );
    if (Object.keys(restored.customSelection).length === 0) return null;
  }

  return restored;
};
