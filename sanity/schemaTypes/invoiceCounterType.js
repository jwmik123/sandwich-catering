import { defineField, defineType } from "sanity";

// Atomic per-year counter for gapless, chronological invoice numbers (see ADR 0003).
// One document per year, id `invoiceCounter-<year>`, incremented server-side with inc().
// Not meant to be edited by hand.
export const invoiceCounter = defineType({
  name: "invoiceCounter",
  title: "Invoice Counter",
  type: "document",
  readOnly: true,
  fields: [
    defineField({
      name: "year",
      title: "Year",
      type: "number",
    }),
    defineField({
      name: "seq",
      title: "Last issued sequence",
      type: "number",
    }),
  ],
  preview: {
    select: { year: "year", seq: "seq" },
    prepare({ year, seq }) {
      return { title: `Invoice counter ${year}`, subtitle: `last: ${seq}` };
    },
  },
});

export default invoiceCounter;
