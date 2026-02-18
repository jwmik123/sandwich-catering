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
      validation: (Rule) => Rule.required().custom((email) => {
        if (!email) return "Email is required";
        
        // Support multiple emails separated by commas
        const emails = email.split(',').map(e => e.trim()).filter(e => e !== "");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        for (const emailAddr of emails) {
          if (!emailRegex.test(emailAddr)) {
            return `Invalid email format: ${emailAddr}`;
          }
        }
        
        return true;
      }),
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
      name: "howDidYouFindUs",
      title: "How did you find us",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Google search", value: "google" },
          { title: "Social media", value: "social_media" },
          { title: "Recommendation from friend/colleague", value: "recommendation" },
          { title: "Company website", value: "website" },
          { title: "Advertisement", value: "advertisement" },
          { title: "Repeat customer", value: "repeat_customer" },
          { title: "Other", value: "other" }
        ]
      }
    }),
    defineField({
      name: "howDidYouFindUsOther",
      title: "How did you find us (Other)",
      type: "string",
      description: "Additional details when 'Other' is selected"
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
          title: "Custom Selection / Additional Items",
          description: "Contains custom sandwich selections for custom orders, or additional items from upsell popup for variety orders",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({
                  name: "sandwichId",
                  title: "Sandwich ID (for custom orders)",
                  type: "reference",
                  to: [{ type: "product" }],
                }),
                defineField({
                  name: "categorySlug",
                  title: "Category Slug (for popup products)",
                  type: "string",
                }),
                defineField({
                  name: "selections",
                  type: "array",
                  of: [
                    {
                      type: "object",
                      fields: [
                        defineField({ name: "id", type: "string", title: "Product ID" }),
                        defineField({ name: "name", type: "string", title: "Product Name" }),
                        defineField({ name: "price", type: "number", title: "Price" }),
                        defineField({ name: "breadType", type: "string", title: "Bread Type" }),
                        defineField({ name: "sauce", type: "string", title: "Sauce" }),
                        defineField({ name: "selectedSauce", type: "string", title: "Selected Sauce" }),
                        defineField({ name: "selectedToppings", type: "array", title: "Selected Toppings", of: [{ type: "string" }] }),
                        defineField({ name: "toppings", type: "array", title: "Toppings", of: [{ type: "string" }] }),
                        defineField({ name: "topping", type: "string", title: "Topping (legacy)" }),
                        defineField({ name: "quantity", type: "number", title: "Quantity" }),
                        defineField({ name: "subTotal", type: "number", title: "Subtotal" }),
                      ],
                    },
                  ],
                }),
              ],
            },
          ],
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
            defineField({ name: "glutenFree", title: "Gluten Free", type: "number" }),
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
          title: "Drinks Selection (Raw Data)",
          type: "object",
          description: "Raw drink quantity data. For display, use drinksWithDetails below.",
          fields: [
            // Legacy field names for backward compatibility with old orders
            defineField({ name: "freshOrangeJuice", title: "Fresh Orange Juice", type: "number" }),
            defineField({ name: "verseJus", title: "Verse Jus", type: "number" }),
            defineField({ name: "sodas", title: "Sodas", type: "number" }),
            defineField({ name: "smoothies", title: "Smoothies", type: "number" }),
            defineField({ name: "milk", title: "Milk", type: "number" }),
          ],
          hidden: ({ document }) => !document?.orderDetails?.addDrinks,
        }),
        defineField({
          name: "drinksWithDetails",
          title: "Drinks with Details",
          type: "array",
          description: "Drinks with names, quantities, and prices for display purposes",
          of: [
            {
              type: "object",
              fields: [
                defineField({ name: "name", title: "Drink Name", type: "string" }),
                defineField({ name: "slug", title: "Slug", type: "string" }),
                defineField({ name: "quantity", title: "Quantity", type: "number" }),
                defineField({ name: "price", title: "Price (per item)", type: "number" }),
                defineField({ name: "total", title: "Total Price", type: "number" }),
              ],
            },
          ],
          hidden: ({ document }) => !document?.orderDetails?.addDrinks,
        }),
        defineField({
          name: "upsellAddons",
          title: "Upsell Add-ons",
          type: "array",
          description: "Additional products added from upsell popup (for variety orders)",
          of: [
            {
              type: "object",
              fields: [
                defineField({ name: "id", title: "Product ID", type: "string" }),
                defineField({ name: "name", title: "Product Name", type: "string" }),
                defineField({ name: "price", title: "Price (per item)", type: "number" }),
                defineField({ name: "quantity", title: "Quantity", type: "number" }),
                defineField({ name: "subTotal", title: "Subtotal", type: "number" }),
              ],
            },
          ],
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
