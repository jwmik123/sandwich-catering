import { defineField, defineType } from "sanity";

export const popupConfig = defineType({
  name: "popupConfig",
  title: "Upsell Popup Configuration",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Internal title for this configuration",
      initialValue: "First-time Variety Selector Popup",
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      description: "Enable or disable the popup",
      initialValue: true,
    }),
    defineField({
      name: "popupTitle",
      title: "Popup Title",
      type: "string",
      description: "The title shown in the popup dialog",
      initialValue: "Would you like to add some extras?",
    }),
    defineField({
      name: "popupDescription",
      title: "Popup Description",
      type: "text",
      description: "Optional description text shown below the title",
    }),
    defineField({
      name: "products",
      title: "Featured Products",
      type: "array",
      description: "Select up to 4 products to feature in the popup",
      of: [
        {
          type: "reference",
          to: [{ type: "product" }],
        },
      ],
      validation: (rule) =>
        rule.max(4).error("You can select up to 4 products"),
    }),
  ],
  preview: {
    select: {
      title: "title",
      active: "active",
    },
    prepare({ title, active }) {
      return {
        title: title,
        subtitle: active ? "Active" : "Inactive",
      };
    },
  },
});
