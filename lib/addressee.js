// Who an invoice is addressed to (ADR 0004). These stay editable on an issued
// invoice; everything else it bills stays as booked.
// Shared by the Studio schema and the server.

export const ADDRESSEE_ORDER_FIELDS = [
  "name",
  "email",
  "invoiceEmail",
  "phoneNumber",
  "street",
  "houseNumber",
  "houseNumberAddition",
  "postalCode",
  "city",
];

/** The addressee part of an invoice document. */
export function pickAddressee(doc = {}) {
  const od = doc.orderDetails || {};
  return {
    referenceNumber: doc.referenceNumber ?? null,
    companyDetails: doc.companyDetails ?? null,
    orderDetails: Object.fromEntries(ADDRESSEE_ORDER_FIELDS.map((k) => [k, od[k] ?? null])),
  };
}

export function sameValue(a, b) {
  return JSON.stringify(sortKeys(a ?? null)) === JSON.stringify(sortKeys(b ?? null));
}

export function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v)
        .filter((k) => v[k] !== undefined && v[k] !== "" && v[k] !== null)
        .sort()
        .map((k) => [k, sortKeys(v[k])])
    );
  }
  return v;
}
