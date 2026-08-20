// lib/gtm.js
// dataLayer helpers for the GTM checkout funnel (GTM-KQQWC86W).
//
// Every ecommerce event is pushed as a `{ ecommerce: null }` reset followed by
// the event itself, so a previous event's items never leak into the next one.

import {
  breadTypes,
  SANDWICH_PRICE_VARIETY,
  GLUTEN_FREE_SURCHARGE,
} from "@/app/assets/constants";
import { round2 } from "@/lib/vat-calculations";

const CURRENCY = "EUR";
const SNAPSHOT_PREFIX = "gtmOrder:";
const PURCHASE_FIRED_PREFIX = "gtmPurchaseFired:";

// Order matches the way the categories are presented in VarietySelector.
const VARIETY_CATEGORIES = [
  {
    key: "nonVega",
    itemId: "variety_chicken_meat_fish",
    itemName: "Chicken, Meat, Fish",
    surcharge: 0,
  },
  {
    key: "vega",
    itemId: "variety_vegetarian",
    itemName: "Vegetarian",
    surcharge: 0,
  },
  {
    key: "vegan",
    itemId: "variety_vegan",
    itemName: "Vegan",
    surcharge: 0,
  },
  {
    key: "glutenFree",
    itemId: "variety_gluten_free",
    itemName: "Gluten Free",
    surcharge: GLUTEN_FREE_SURCHARGE,
  },
];

export const push = (payload) => {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
};

export const pushEcommerce = (payload) => {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(payload);
};

export const getOrderType = (formData) =>
  formData?.selectionType === "variety" ? "variety" : "create_your_own";

const getCategorySlug = (product) => {
  const category = product?.category;
  if (!category) return null;
  if (typeof category === "string") return category;
  return category.slug?.current || category.slug || null;
};

/**
 * Only Specials and Basics are sandwiches — those are the categories that get a
 * bread type. Drinks are their own category, and everything else (Sweets,
 * Other: cookies, bowls, banana bread) is an addon so it never inflates
 * `amount_sandwiches`.
 */
const getItemCategory = (product, fallback = "addon") => {
  const slug = getCategorySlug(product);
  if (!slug) return fallback;
  if (slug === "specials" || slug === "basics") return "sandwich";
  if (slug === "drinks") return "drink";
  return "addon";
};

/**
 * Turn the current selection into GA4 ecommerce items.
 * Sandwiches and drinks are always separate items; `item_category` is derived
 * from the same category check the rest of the app uses (`shouldHaveBreadType`).
 */
export const buildItems = (
  formData,
  { sandwichOptions = [], drinks = [] } = {}
) => {
  const items = [];

  if (formData?.selectionType === "variety") {
    VARIETY_CATEGORIES.forEach((category) => {
      const quantity = formData.varietySelection?.[category.key] || 0;
      if (quantity <= 0) return;

      items.push({
        item_id: category.itemId,
        item_name: category.itemName,
        item_category: "sandwich",
        item_variant: "variety",
        price: round2(SANDWICH_PRICE_VARIETY + category.surcharge),
        quantity,
      });
    });

    (formData.upsellAddons || []).forEach((addon) => {
      if (!addon?.quantity) return;
      const product = sandwichOptions.find((option) => option._id === addon.id);

      items.push({
        item_id: addon.id,
        item_name: addon.name,
        item_category: getItemCategory(product),
        price: round2(addon.price),
        quantity: addon.quantity,
      });
    });
  } else {
    Object.entries(formData?.customSelection || {}).forEach(
      ([sandwichId, selections]) => {
        const product = sandwichOptions.find(
          (option) => option._id === sandwichId
        );

        (selections || []).forEach((selection) => {
          if (!selection?.quantity) return;
          const breadType = breadTypes.find(
            (bread) => bread.id === selection.breadType
          )?.name;

          items.push({
            item_id: sandwichId,
            item_name: product?.name || sandwichId,
            // Everything picked here came from the sandwich menu, so an
            // unresolved product still counts as a sandwich.
            item_category: getItemCategory(product, "sandwich"),
            ...(breadType ? { item_variant: breadType } : {}),
            price: round2(selection.subTotal / selection.quantity),
            quantity: selection.quantity,
          });
        });
      }
    );
  }

  drinks.forEach((drink) => {
    const quantity = formData?.drinks?.[drink.slug] || 0;
    if (quantity <= 0) return;

    items.push({
      item_id: drink._id,
      item_name: drink.name,
      item_category: "drink",
      price: round2(drink.price),
      quantity,
    });
  });

  return items;
};

export const countSandwiches = (items = []) =>
  items.reduce(
    (total, item) =>
      item.item_category === "sandwich" ? total + item.quantity : total,
    0
  );

export const buildEcommerce = (items, value) => ({
  currency: CURRENCY,
  value: round2(value || 0),
  items,
});

/**
 * Best-effort E.164 formatting; Dutch numbers are entered as "06 12345678".
 */
export const toE164 = (phoneNumber, countryCode = "31") => {
  if (!phoneNumber) return undefined;

  const trimmed = String(phoneNumber).trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;

  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+${countryCode}${digits.slice(1)}`;
  if (digits.startsWith(countryCode)) return `+${digits}`;
  return `+${countryCode}${digits}`;
};

const buildAddress = (formData) => {
  const street = [
    formData?.street,
    formData?.houseNumber,
    formData?.houseNumberAddition,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const address = { country: "NL" };
  if (street) address.street = street;
  if (formData?.postalCode) address.postal_code = formData.postalCode;
  if (formData?.city) address.city = formData.city;
  return address;
};

/**
 * The delivery address is known from step 4 onwards; contact details only from
 * step 5. There is no separate first/last name field in the form — the single
 * "Company name (or full name)" input is sent as `company_name`.
 */
export const buildUserData = (formData, { includeContact = false } = {}) => {
  const userData = { address: buildAddress(formData) };
  if (!includeContact) return userData;

  // The email field accepts a comma-separated list; the first one is the buyer.
  const primaryEmail = (formData?.email || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (primaryEmail) userData.email = primaryEmail;

  const phoneNumber = toE164(formData?.phoneNumber);
  if (phoneNumber) userData.phone_number = phoneNumber;

  if (formData?.companyName) userData.company_name = formData.companyName;

  return userData;
};

export const trackAmountStep = (totalSandwiches) => {
  push({
    event: "funnel_step",
    step_name: "amount_sandwiches",
    step_number: 1,
    amount_sandwiches: Number(totalSandwiches) || 0,
  });
};

export const trackFunnelStep = ({
  stepName,
  stepNumber,
  formData,
  sandwichOptions,
  drinks,
  totalAmount,
  extra = {},
  userData,
}) => {
  const items = buildItems(formData, { sandwichOptions, drinks });

  const payload = {
    event: "funnel_step",
    step_name: stepName,
    step_number: stepNumber,
    order_type: getOrderType(formData),
    amount_sandwiches: countSandwiches(items),
    ...extra,
    ecommerce: buildEcommerce(items, totalAmount),
  };
  if (userData) payload.user_data = userData;

  pushEcommerce(payload);
};

export const trackDownloadQuote = ({
  formData,
  sandwichOptions,
  drinks,
  totalAmount,
}) => {
  const items = buildItems(formData, { sandwichOptions, drinks });

  pushEcommerce({
    event: "download_quote",
    order_type: getOrderType(formData),
    amount_sandwiches: countSandwiches(items),
    ecommerce: buildEcommerce(items, totalAmount),
  });
};

/**
 * The confirmation page only receives `quoteId` and `type` in the URL, so the
 * order is snapshotted here and read back there. It stays in the buyer's own
 * browser, which keeps their email and phone number off a public endpoint.
 */
export const storeOrderSnapshot = (quoteId, snapshot) => {
  if (typeof window === "undefined" || !quoteId) return;

  try {
    window.localStorage.setItem(
      `${SNAPSHOT_PREFIX}${quoteId}`,
      JSON.stringify(snapshot)
    );
  } catch (error) {
    console.warn("Could not store the order snapshot for analytics", error);
  }
};

/**
 * Fires `purchase` at most once per quoteId. The guard lives in localStorage so
 * it survives closing and reopening the confirmation URL.
 */
export const trackPurchase = (quoteId, paymentTypeFromUrl) => {
  if (typeof window === "undefined" || !quoteId) return;

  let snapshot = null;
  try {
    if (window.localStorage.getItem(`${PURCHASE_FIRED_PREFIX}${quoteId}`)) {
      return;
    }
    const stored = window.localStorage.getItem(`${SNAPSHOT_PREFIX}${quoteId}`);
    snapshot = stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Could not read the order snapshot for analytics", error);
    return;
  }

  if (!snapshot?.ecommerce) {
    console.warn(
      `No order snapshot for ${quoteId}; the purchase event was not sent.`
    );
    return;
  }

  pushEcommerce({
    event: "purchase",
    ecommerce: {
      ...snapshot.ecommerce,
      transaction_id: quoteId,
      payment_type: paymentTypeFromUrl || snapshot.ecommerce.payment_type,
    },
    ...(snapshot.user_data ? { user_data: snapshot.user_data } : {}),
  });

  try {
    window.localStorage.setItem(`${PURCHASE_FIRED_PREFIX}${quoteId}`, "1");
    window.localStorage.removeItem(`${SNAPSHOT_PREFIX}${quoteId}`);
  } catch (error) {
    console.warn("Could not mark the purchase event as sent", error);
  }
};
