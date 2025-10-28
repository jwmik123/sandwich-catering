// constants.js
export const breadTypes = [
  { id: "baguette", name: "Baguette", surcharge: 0 },
  { id: "spelt", name: "Spelt bread", surcharge: 0.5 },
  { id: "gluten-free", name: "Gluten-free bread", surcharge: 3.5 },
];

export const sauces = [
  { id: "geen", name: "Geen Saus" },
  { id: "mosterd", name: "Mosterd" },
  { id: "truffelmayo", name: "Truffelmayonaise" },
  { id: "pesto", name: "Pesto" },
];

export const toppings = [
  { id: "geen", name: "Geen Toppings" },
  { id: "kaas", name: "Kaas" },
  { id: "ham", name: "Ham" },
  { id: "salami", name: "Salami" },
  { id: "tomaat", name: "Tomaat" },
  { id: "sla", name: "Sla" },
  { id: "ui", name: "Ui" },
  { id: "komkommer", name: "Komkommer" },
];

// Drink prices (VAT-exclusive) - DEPRECATED: Use Sanity drinks instead
// These are kept as fallbacks for backwards compatibility
export const DRINK_PRICES = {
  FRESH_ORANGE_JUICE: 3.62,
  SODAS: 2.71,
  COLD_PRESSED_JUICES: 6.38, // Updated from SMOOTHIES
  SMOOTHIES: 6.38, // Kept for backwards compatibility
  MILK: 2.71,
};

// Sandwich pricing
export const SANDWICH_PRICE_VARIETY = 6.83;
export const GLUTEN_FREE_SURCHARGE = 2.75;
