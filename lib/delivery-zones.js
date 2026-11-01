// Delivery zones are edited in Sanity (Studio → Delivery Zones). Each zone has
// a cost, an optional order amount from which delivery is free, and the
// 4-digit postcodes it covers. Shared by the order form and the API routes.
import { round2 } from "@/lib/vat-calculations";

export const NO_DELIVERY = "We do not deliver to this postal code.";

export const postcodeDigits = (postalCode) =>
  (postalCode || "").replace(/\s/g, "").substring(0, 4);

export const findZone = (zones, postalCode) => {
  const digits = postcodeDigits(postalCode);
  if (digits.length < 4) return null;
  return (zones || []).find((zone) => zone.postcodes?.includes(digits)) || null;
};

const hasFreeDelivery = (zone) => typeof zone.freeDeliveryFrom === "number";

/**
 * Delivery cost for an order to this postcode.
 * @param {number} subtotal - Order amount excluding VAT and delivery
 * @returns {{cost: number, freeDeliveryFrom: number|null} | {error: string}}
 */
export const getDeliveryQuote = (zones, postalCode, subtotal) => {
  const zone = findZone(zones, postalCode);
  if (!zone) return { error: NO_DELIVERY };

  const free = hasFreeDelivery(zone) && subtotal >= zone.freeDeliveryFrom;
  return {
    cost: free ? 0 : zone.cost,
    freeDeliveryFrom: hasFreeDelivery(zone) ? zone.freeDeliveryFrom : null,
  };
};

/** Message under the postcode field; "" when there is nothing to say. */
export const deliveryMessage = (quote) =>
  quote.cost > 0 && quote.freeDeliveryFrom !== null
    ? `Free delivery available for orders over €${quote.freeDeliveryFrom} in your area`
    : "";

/**
 * Server-side check of the delivery cost the browser sent along. The order
 * subtotal is derived from the VAT-inclusive total, which can be a cent off,
 * so an order right at the free-delivery threshold is accepted either way.
 * @returns {string|null} Reason to refuse the order, or null when it is fine
 */
export const checkDeliveryCost = (zones, postalCode, totalInclVat, claimedCost) => {
  const zone = findZone(zones, postalCode);
  if (!zone) return `${NO_DELIVERY} (${postcodeDigits(postalCode)})`;

  const claimed = round2(Number(claimedCost) || 0);
  const subtotal = round2(round2(Number(totalInclVat) || 0) / 1.09 - claimed);
  const allowed = [subtotal - 0.05, subtotal + 0.05].map(
    (amount) => getDeliveryQuote(zones, postalCode, amount).cost
  );
  return allowed.includes(claimed)
    ? null
    : `Delivery cost €${claimed} does not match the zone of postcode ${postcodeDigits(postalCode)}`;
};
