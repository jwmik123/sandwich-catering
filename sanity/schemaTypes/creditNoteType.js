import { defineField, defineType } from "sanity";

// A credit note cancels an invoice that was already booked in Yuki (ADR 0004).
// An issued invoice is never edited: the order is changed by crediting the old
// invoice in full and issuing a new one. Everything here is written by the app.
export const creditNote = defineType({
  name: "creditNote",
  title: "Credit Note",
  type: "document",
  readOnly: true,
  fieldsets: [{ name: "yuki", title: "Yuki", options: { collapsible: true } }],
  fields: [
    defineField({
      name: "creditNoteNumber",
      title: "Credit Note Number",
      type: "string",
    }),
    defineField({
      name: "invoice",
      title: "Credits invoice",
      type: "reference",
      to: [{ type: "invoice" }],
    }),
    defineField({
      name: "invoiceNumber",
      title: "Credited invoice number",
      type: "string",
    }),
    defineField({
      name: "replacementInvoice",
      title: "Replaced by invoice",
      type: "reference",
      to: [{ type: "invoice" }],
      weak: true,
    }),
    defineField({
      name: "reason",
      title: "Reason",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "amount",
      title: "Amount credited",
      description: "Positive amounts; the credit note books them negatively.",
      type: "object",
      fields: [
        defineField({ name: "total", type: "number", title: "Total" }),
        defineField({ name: "subtotal", type: "number", title: "Subtotal" }),
        defineField({ name: "delivery", type: "number", title: "Delivery Cost" }),
        defineField({ name: "vat", type: "number", title: "VAT" }),
      ],
    }),
    defineField({
      name: "creditedSnapshot",
      title: "Credited invoice (as booked)",
      description:
        "JSON of the orderDetails and amount exactly as they were booked in Yuki. The credit note mirrors these lines.",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
    }),
    defineField({
      name: "emailSentAt",
      title: "Sent to customer at",
      type: "datetime",
    }),
    defineField({
      name: "yukiSent",
      title: "Booked in Yuki",
      type: "boolean",
      fieldset: "yuki",
    }),
    defineField({
      name: "yukiSentAt",
      title: "Booked in Yuki At",
      type: "datetime",
      fieldset: "yuki",
    }),
    defineField({
      name: "yukiVerifiedAt",
      title: "Verified in Yuki At",
      type: "datetime",
      fieldset: "yuki",
    }),
    defineField({
      name: "yukiContactCode",
      title: "Yuki Contact Code",
      type: "string",
      fieldset: "yuki",
    }),
    defineField({
      name: "yukiContactName",
      title: "Yuki Contact Name",
      type: "string",
      fieldset: "yuki",
    }),
    defineField({
      name: "yukiError",
      title: "Yuki Error",
      type: "text",
      rows: 3,
      fieldset: "yuki",
    }),
  ],
  preview: {
    select: {
      number: "creditNoteNumber",
      invoiceNumber: "invoiceNumber",
      total: "amount.total",
      booked: "yukiSent",
    },
    prepare({ number, invoiceNumber, total, booked }) {
      const euro = typeof total === "number" ? `−€${total.toFixed(2)}` : "";
      return {
        title: `${number || "Credit note (no number yet)"} · ${invoiceNumber || ""}`,
        subtitle: [euro, booked ? "booked in Yuki" : "not booked"].filter(Boolean).join(" · "),
      };
    },
  },
});

export default creditNote;
