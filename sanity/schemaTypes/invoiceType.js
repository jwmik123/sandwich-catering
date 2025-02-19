// schemas/invoice.js
import { defineField, defineType } from "sanity";

export const invoice = defineType({
  name: "invoice",
  title: "Invoices",
  type: "document",
  fields: [
    defineField({
      name: "quoteId",
      title: "Quote ID",
      type: "string",
    }),
    defineField({
      name: "invoiceNumber",
      title: "Invoice Number",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "amount",
      title: "Amount",
      type: "object",
      fields: [
        defineField({ name: "total", type: "number" }),
        defineField({ name: "subtotal", type: "number" }),
        defineField({ name: "vat", type: "number" }),
      ],
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Paid", value: "paid" },
          { title: "Overdue", value: "overdue" },
          { title: "Cancelled", value: "cancelled" },
        ],
      },
    }),
    defineField({
      name: "dueDate",
      title: "Due Date",
      type: "datetime",
    }),
    defineField({
      name: "companyDetails",
      title: "Company Details",
      type: "object",
      fields: [
        defineField({ name: "name", type: "string" }),
        defineField({ name: "vatNumber", type: "string" }),
        defineField({
          name: "address",
          type: "object",
          fields: [
            defineField({ name: "street", type: "string" }),
            defineField({ name: "houseNumber", type: "string" }),
            defineField({ name: "houseNumberAddition", type: "string" }),
            defineField({ name: "postalCode", type: "string" }),
            defineField({ name: "city", type: "string" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "paymentStatus",
      title: "Payment Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Paid", value: "paid" },
          { title: "Failed", value: "failed" },
          { title: "Expired", value: "expired" },
          { title: "Canceled", value: "canceled" },
        ],
      },
    }),
    defineField({
      name: "paymentId",
      title: "Mollie Payment ID",
      type: "string",
    }),
    defineField({
      name: "lastPaymentUpdate",
      title: "Last Payment Update",
      type: "datetime",
    }),
    defineField({
      name: "paidAt",
      title: "Paid At",
      type: "datetime",
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
    }),
  ],
});

export default invoice;
