import { defineField, defineType } from "sanity";

export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Specials", value: "specials" },
          { title: "Basics", value: "basics" },
          { title: "Croissants", value: "croissants" },
          { title: "Zoetigheden", value: "zoetigheden" },
          { title: "Frisdranken", value: "frisdranken" },
        ],
      },
    }),
    defineField({
      name: "dietaryType",
      title: "Dietary Type",
      type: "string",
      options: {
        list: [
          { title: "Non-Vegetarian", value: "non-vega" },
          { title: "Vegetarian", value: "vega" },
          { title: "Vegan", value: "vegan" },
        ],
      },
    }),
    defineField({
      name: "hasSauceOptions",
      title: "Has Sauce Options",
      type: "boolean",
      description: "Enable if this product should have sauce selection options",
    }),
    defineField({
      name: "sauceOptions",
      title: "Sauce Options",
      type: "array",
      of: [
        {
          type: "object",
          name: "sauceOption",
          fields: [
            {
              name: "name",
              title: "Sauce Name",
              type: "string",
            },
            {
              name: "price",
              title: "Additional Price",
              type: "number",
              description: "Extra cost for this sauce (0 if no extra charge)",
              initialValue: 0,
            },
            {
              name: "isDefault",
              title: "Default Selection",
              type: "boolean",
              description: "Is this sauce selected by default?",
              initialValue: false,
            },
          ],
        },
      ],
      hidden: ({ document }) => !document?.hasSauceOptions,
      validation: (rule) =>
        rule.custom((sauces, context) => {
          if (
            context.document?.hasSauceOptions &&
            (!sauces || sauces.length === 0)
          ) {
            return "At least one sauce option is required when sauce options are enabled";
          }
          return true;
        }),
    }),
  ],
});
