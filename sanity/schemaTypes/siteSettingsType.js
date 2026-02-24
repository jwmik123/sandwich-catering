import { defineField, defineType, defineArrayMember } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "disabledDates",
      title: "Disabled Delivery Dates",
      type: "array",
      description: "Dates or date ranges where delivery is not available.",
      of: [
        defineArrayMember({
          type: "object",
          name: "disabledPeriod",
          fields: [
            defineField({
              name: "label",
              title: "Reason",
              type: "string",
              description: 'e.g. "Christmas", "Staff training", "Public holiday"',
              validation: (Rule) => Rule.required().error("A reason is required"),
            }),
            defineField({
              name: "startDate",
              title: "Date",
              type: "date",
              options: { dateFormat: "YYYY-MM-DD" },
              validation: (Rule) => Rule.required().error("A date is required"),
            }),
            defineField({
              name: "endDate",
              title: "End date",
              type: "date",
              options: { dateFormat: "YYYY-MM-DD" },
              description: "Optional. Set to block a range of dates instead of a single day.",
            }),
          ],
          preview: {
            select: {
              label: "label",
              startDate: "startDate",
              endDate: "endDate",
            },
            prepare({ label, startDate, endDate }) {
              const dateStr = endDate
                ? `${startDate} → ${endDate}`
                : startDate;
              return {
                title: label,
                subtitle: dateStr,
              };
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site Settings" };
    },
  },
});
