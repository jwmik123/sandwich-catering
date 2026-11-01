// Server-side: checks the delivery cost the browser sent along against the
// delivery zones in Sanity, so an order cannot go out at the wrong cost or to a
// postcode we do not deliver to.
import { client } from "@/sanity/lib/client";
import { DELIVERY_ZONES_QUERY } from "@/sanity/lib/queries";
import { checkDeliveryCost } from "@/lib/delivery-zones";

/** @returns {Promise<string|null>} Reason to refuse the order, or null */
export async function verifyDeliveryCost({ postalCode, amount, deliveryCost }) {
  let zones;
  try {
    // No CDN: a zone the client just changed must count right away.
    zones = await client.withConfig({ useCdn: false }).fetch(DELIVERY_ZONES_QUERY);
  } catch (error) {
    // Do not lose the order over a Sanity hiccup; the browser already checked.
    console.error("Delivery cost check skipped, zones could not be loaded:", error);
    return null;
  }
  if (!zones?.length) {
    console.error("Delivery cost check skipped, no delivery zones in Sanity");
    return null;
  }
  return checkDeliveryCost(zones, postalCode, amount, deliveryCost);
}
