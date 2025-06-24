import { defineQuery } from "next-sanity";

export const PRODUCT_QUERY = defineQuery(`*[_type == "product"] {
  _id,
  _createdAt,
  name,
  description,
  image,
  allergyInfo,
  allergyNotes,
  price,
  category,
  dietaryType,
  hasSauceOptions,
  sauceOptions[] {
    name,
    price,
    isDefault
  },
  hasToppings,
  toppingOptions[] {
    name,
    price,
    isDefault
  }
}`);
