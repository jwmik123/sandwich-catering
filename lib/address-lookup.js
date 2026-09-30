// Street lookup for a Dutch postcode + house number through PDOK Locatieserver,
// the free public address service of the Dutch government (no key needed).
// Called from the browser; when it fails the customer simply types the street.

const PDOK_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free";

export const normalizePostcode = (value) =>
  (value || "").replace(/\s/g, "").toUpperCase();

export const isCompletePostcode = (value) => /^\d{4}[A-Z]{2}$/.test(normalizePostcode(value));

export const houseNumberDigits = (value) => (value || "").match(/^\s*(\d+)/)?.[1] || "";

/**
 * Resolves to { street, city } or null when the address is unknown.
 * Throws on network errors so callers can tell "not found" from "offline".
 */
export const lookupStreet = async (postalCode, houseNumber, { signal } = {}) => {
  const postcode = normalizePostcode(postalCode);
  const number = houseNumberDigits(houseNumber);
  if (!isCompletePostcode(postcode) || !number) return null;

  const params = new URLSearchParams({
    q: `postcode:${postcode} and huisnummer:${number}`,
    fq: "type:adres",
    fl: "straatnaam,woonplaatsnaam",
    rows: "1",
  });
  const response = await fetch(`${PDOK_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Address lookup failed (${response.status})`);

  const doc = (await response.json())?.response?.docs?.[0];
  return doc?.straatnaam ? { street: doc.straatnaam, city: doc.woonplaatsnaam || "" } : null;
};
