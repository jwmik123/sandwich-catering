import { defineField, defineType } from "sanity";

export const quote = defineType({
  name: "quote",
  title: "Quotes",
  type: "document",
  fields: [
    defineField({
      name: "quoteId",
      title: "Quote ID",
      type: "string",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.email().required(),
    }),
    defineField({
      name: "phoneNumber",
      title: "Phone Number",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "name",
      title: "Full Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "orderDetails",
      title: "Order Details",
      type: "object",
      fields: [
        defineField({
          name: "numberOfPeople",
          title: "Number of People",
          type: "string",
        }),
        defineField({
          name: "sandwichesPerPerson",
          title: "Sandwiches per Person",
          type: "number",
        }),
        defineField({
          name: "totalSandwiches",
          title: "Total Sandwiches",
          type: "number",
        }),
        defineField({
          name: "selectionType",
          title: "Selection Type",
          type: "string",
          options: {
            list: [
              { title: "Custom", value: "custom" },
              { title: "Variety", value: "variety" },
            ],
          },
        }),
        defineField({
          name: "customSelection",
          title: "Custom Selection",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({
                  name: "sandwichId",
                  type: "reference",
                  to: [{ type: "product" }],
                }),
                defineField({
                  name: "selections",
                  type: "array",
                  of: [
                    {
                      type: "object",
                      fields: [
                        defineField({ name: "breadType", type: "string" }),
                        defineField({ name: "sauce", type: "string" }),
                        defineField({ name: "topping", type: "string" }),
                        defineField({ name: "quantity", type: "number" }),
                        defineField({ name: "subTotal", type: "number" }),
                      ],
                    },
                  ],
                }),
              ],
            },
          ],
          hidden: ({ document }) =>
            document?.orderDetails?.selectionType !== "custom",
        }),
        defineField({
          name: "varietySelection",
          title: "Variety Selection",
          type: "object",
          fields: [
            defineField({ name: "vega", title: "Vegetarian", type: "number" }),
            defineField({
              name: "nonVega",
              title: "Non-Vegetarian",
              type: "number",
            }),
            defineField({ name: "vegan", title: "Vegan", type: "number" }),
          ],
          hidden: ({ document }) =>
            document?.orderDetails?.selectionType !== "variety",
        }),
        defineField({
          name: "addDrinks",
          title: "Add Drinks",
          type: "boolean",
        }),
        defineField({
          name: "drinks",
          title: "Drinks Selection",
          type: "object",
          fields: [
            defineField({ name: "verseJus", title: "Fresh Juice", type: "number" }),
            defineField({ name: "sodas", title: "Sodas", type: "number" }),
            defineField({ name: "smoothies", title: "Smoothies", type: "number" }),
          ],
          hidden: ({ document }) => !document?.orderDetails?.addDrinks,
        }),
      ],
    }),
    defineField({
      name: "allergies",
      title: "Allergies",
      type: "string",
    }),
    defineField({
      name: "deliveryDetails",
      title: "Delivery Details",
      type: "object",
      fields: [
        defineField({
          name: "deliveryDate",
          title: "Delivery Date",
          type: "date",
        }),
        defineField({
          name: "deliveryTime",
          title: "Delivery Time",
          type: "string",
        }),
        defineField({
          name: "address",
          title: "Address",
          type: "object",
          fields: [
            defineField({ name: "street", title: "Street", type: "string" }),
            defineField({
              name: "houseNumber",
              title: "House Number",
              type: "string",
            }),
            defineField({
              name: "houseNumberAddition",
              title: "Addition",
              type: "string",
            }),
            defineField({
              name: "postalCode",
              title: "Postal Code",
              type: "string",
            }),
            defineField({ name: "city", title: "City", type: "string" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "invoiceDetails",
      title: "Invoice Details",
      type: "object",
      fields: [
        defineField({
          name: "sameAsDelivery",
          title: "Same as Delivery Address",
          type: "boolean",
          initialValue: true,
        }),
        defineField({
          name: "address",
          title: "Invoice Address",
          type: "object",
          fields: [
            defineField({ name: "street", title: "Street", type: "string" }),
            defineField({
              name: "houseNumber",
              title: "House Number",
              type: "string",
            }),
            defineField({
              name: "houseNumberAddition",
              title: "Addition",
              type: "string",
            }),
            defineField({
              name: "postalCode",
              title: "Postal Code",
              type: "string",
            }),
            defineField({ name: "city", title: "City", type: "string" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "companyDetails",
      title: "Company Details",
      type: "object",
      fields: [
        defineField({
          name: "companyName",
          title: "Company Name",
          type: "string",
        }),
        defineField({
          name: "companyVAT",
          title: "Company VAT Number",
          type: "string",
        }),
        defineField({
          name: "referenceNumber",
          title: "Reference Number",
          type: "string",
          description: "Optional internal reference number for the customer",
        }),
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
          { title: "Cancelled", value: "cancelled" },
        ],
      },
    }),
    defineField({
      name: "pdfAsset",
      title: "PDF Document",
      type: "file",
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
    }),
  ],
});

export default quote;
