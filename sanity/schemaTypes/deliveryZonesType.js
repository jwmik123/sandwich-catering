import { defineField, defineType, defineArrayMember } from "sanity";

const POSTCODE_REGEX = /^\d{4}$/;

const formatEuro = (value) =>
  typeof value === "number" ? `€${value.toFixed(2).replace(".", ",")}` : "–";

export const deliveryZones = defineType({
  name: "deliveryZones",
  title: "Delivery Zones",
  type: "document",
  fields: [
    defineField({
      name: "zones",
      title: "Zones",
      type: "array",
      description:
        "Every postcode we deliver to belongs to exactly one zone. A postcode that is in no zone gets \"We do not deliver to this postal code.\"",
      validation: (Rule) =>
        Rule.custom((zones) => {
          const seen = new Map();
          const duplicates = [];
          for (const zone of zones || []) {
            for (const code of zone.postcodes || []) {
              if (seen.has(code)) duplicates.push(`${code} (${seen.get(code)} and ${zone.label})`);
              else seen.set(code, zone.label);
            }
          }
          return duplicates.length
            ? `Postcode in more than one zone: ${duplicates.join(", ")}`
            : true;
        }),
      of: [
        defineArrayMember({
          type: "object",
          name: "deliveryZone",
          fields: [
            defineField({
              name: "label",
              title: "Name",
              type: "string",
              description: 'For yourself only, e.g. "Centre" or "Zone €16,95"',
              validation: (Rule) => Rule.required().error("A name is required"),
            }),
            defineField({
              name: "cost",
              title: "Delivery cost (excl. VAT)",
              type: "number",
              validation: (Rule) =>
                Rule.required().min(0).precision(2).error("Enter an amount, e.g. 16.95"),
            }),
            defineField({
              name: "freeDeliveryFrom",
              title: "Free delivery from (excl. VAT)",
              type: "number",
              description:
                "Order amount from which delivery is free. Leave empty to always charge the delivery cost.",
              validation: (Rule) => Rule.min(0).precision(2),
            }),
            defineField({
              name: "postcodes",
              title: "Postcodes",
              type: "array",
              description: "The 4 digits only, e.g. 1075. Press enter after each postcode.",
              of: [{ type: "string" }],
              options: { layout: "tags" },
              validation: (Rule) => [
                Rule.required().min(1).error("Add at least one postcode"),
                Rule.unique().error("This postcode is already in this zone"),
                Rule.custom((codes) => {
                  const invalid = (codes || []).filter((c) => !POSTCODE_REGEX.test(c));
                  return invalid.length
                    ? `Not a 4-digit postcode: ${invalid.join(", ")}`
                    : true;
                }),
              ],
            }),
          ],
          preview: {
            select: {
              label: "label",
              cost: "cost",
              freeDeliveryFrom: "freeDeliveryFrom",
              postcodes: "postcodes",
            },
            prepare({ label, cost, freeDeliveryFrom, postcodes }) {
              const free =
                typeof freeDeliveryFrom === "number"
                  ? `free from ${formatEuro(freeDeliveryFrom)}`
                  : "always charged";
              return {
                title: label,
                subtitle: `${formatEuro(cost)} · ${free} · ${(postcodes || []).length} postcodes`,
              };
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Delivery Zones" };
    },
  },
});
