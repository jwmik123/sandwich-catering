import { defineField, defineType } from "sanity";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";

export const drink = defineType({
  name: "drink",
  title: "Drink",
  type: "document",
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: "drink" }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      description: "Uncheck to hide this drink from the menu",
      initialValue: true,
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required().error("Drink name is required"),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "Used as the identifier in the code (e.g., 'fresh-orange-juice', 'sodas', 'cold-pressed-juices', 'milk')",
      validation: (rule) => rule.required().error("Slug is required"),
      options: {
        source: "name",
        maxLength: 96,
      },
    }),
    defineField({
      name: "price",
      title: "Price (excl. VAT)",
      type: "number",
      description: "Price excluding VAT",
      validation: (rule) => rule.required().min(0).error("Price is required and must be positive"),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      description: "Optional description for the drink",
    }),
  ],
});
