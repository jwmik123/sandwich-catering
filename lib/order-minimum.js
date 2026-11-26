// The smallest order we take. Weekend deliveries are only worth it for a
// bigger order, so Saturdays and Sundays have a higher minimum.
export const MIN_SANDWICHES = 20;
export const MIN_SANDWICHES_WEEKEND = 35;

// "2026-11-28" → true for a Saturday or Sunday. Parsed as a local date, so the
// server's time zone does not shift the day.
export const isWeekendDate = (value) => {
  if (!value) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return false;
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
};

export const minSandwichesFor = (deliveryDate) =>
  isWeekendDate(deliveryDate) ? MIN_SANDWICHES_WEEKEND : MIN_SANDWICHES;

export const minimumMessage = (deliveryDate) =>
  isWeekendDate(deliveryDate)
    ? `Weekend orders start at ${MIN_SANDWICHES_WEEKEND} sandwiches`
    : `The minimum order is ${MIN_SANDWICHES} sandwiches`;

// The number of sandwiches in an order as the client sends it: the mix for a
// variety order, every picked sandwich for a custom one. Add-ons do not count.
export const countSandwiches = (orderDetails = {}) => {
  if (orderDetails.selectionType === "custom") {
    return Object.values(orderDetails.customSelection || {})
      .flat()
      .reduce((total, selection) => total + (Number(selection?.quantity) || 0), 0);
  }
  const mix = orderDetails.varietySelection || {};
  return ["nonVega", "vega", "vegan", "glutenFree"].reduce(
    (total, key) => total + (Number(mix[key]) || 0),
    0
  );
};

// Why the server should refuse this order, or null when it meets the minimum.
export const orderMinimumProblem = (orderDetails = {}) => {
  const min = minSandwichesFor(orderDetails.deliveryDate);
  const count = Math.max(
    Number(orderDetails.totalSandwiches) || 0,
    countSandwiches(orderDetails)
  );
  return count < min ? minimumMessage(orderDetails.deliveryDate) : null;
};
