// lib/vat-calculations.js
// VAT calculation utilities for The Sandwichbar (Netherlands)
// Uses standard rounding (Math.round) to match Yuki's calculations

// VAT rate in Netherlands for food items
export const VAT_RATE = 0.09; // 9% VAT

/**
 * Round to 2 decimal places (standard rounding)
 * This matches how Yuki calculates amounts
 * @param {number} value - The value to round
 * @returns {number} - Rounded value
 */
export const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Calculate line item subtotal with proper rounding
 * @param {number} unitPrice - Price per unit (VAT-inclusive)
 * @param {number} quantity - Number of items
 * @returns {number} - Rounded subtotal
 */
export const calculateLineSubtotal = (unitPrice, quantity) => {
  return round2(round2(unitPrice) * quantity);
};

/**
 * Calculate VAT breakdown for an order
 * All values are rounded to 2 decimal places to match Yuki
 * @param {number} subtotal - Subtotal for all items (VAT-inclusive)
 * @param {number} deliveryCost - Delivery cost (VAT-exclusive, 9% VAT will be added)
 * @returns {object} VAT breakdown and totals
 */
export const calculateVATBreakdown = (subtotal, deliveryCost = 0) => {
  // Round inputs to 2 decimals
  const roundedSubtotal = round2(subtotal);
  const roundedDelivery = round2(deliveryCost);

  // Calculate the base amount before VAT (subtotal + delivery)
  const baseBeforeVAT = round2(roundedSubtotal + roundedDelivery);

  // Calculate VAT amount (rounded to 2 decimals)
  const vatAmount = round2(baseBeforeVAT * VAT_RATE);

  // Calculate total with VAT (rounded to 2 decimals)
  const totalWithVAT = round2(baseBeforeVAT + vatAmount);

  return {
    subtotal: roundedSubtotal,
    delivery: roundedDelivery,
    baseBeforeVAT: baseBeforeVAT,
    vat: vatAmount,
    total: totalWithVAT,
  };
};

/**
 * Calculate total amount including VAT
 * @param {number} subtotal - Items subtotal (VAT-exclusive)
 * @param {number} deliveryCost - Delivery cost (VAT-exclusive)
 * @returns {number} Total amount including VAT
 */
export const calculateTotalWithVAT = (subtotal, deliveryCost = 0) => {
  const breakdown = calculateVATBreakdown(subtotal, deliveryCost);
  return breakdown.total;
};

/**
 * Convert VAT-inclusive price to VAT-exclusive price
 * Used when sending prices to Yuki (which adds VAT itself)
 * @param {number} priceInclVAT - Price including VAT
 * @returns {number} - Price excluding VAT, rounded to 2 decimals
 */
export const toVATExclusive = (priceInclVAT) => {
  return round2(round2(priceInclVAT) / (1 + VAT_RATE));
};

/**
 * Convert VAT-exclusive price to VAT-inclusive price
 * @param {number} priceExclVAT - Price excluding VAT
 * @returns {number} - Price including VAT, rounded to 2 decimals
 */
export const toVATInclusive = (priceExclVAT) => {
  return round2(round2(priceExclVAT) * (1 + VAT_RATE));
};

/**
 * Format VAT breakdown for display
 * @param {number} subtotal - Items subtotal (VAT-exclusive)
 * @param {number} deliveryCost - Delivery cost (VAT-exclusive)
 * @returns {object} Formatted amounts for display
 */
export const formatVATBreakdown = (subtotal, deliveryCost = 0) => {
  const breakdown = calculateVATBreakdown(subtotal, deliveryCost);

  return {
    subtotal: `€${breakdown.subtotal.toFixed(2)}`,
    delivery: deliveryCost > 0 ? `€${breakdown.delivery.toFixed(2)}` : null,
    vat: `€${breakdown.vat.toFixed(2)}`,
    total: `€${breakdown.total.toFixed(2)}`,
    breakdown: breakdown,
  };
};
