import { defineQuery } from "next-sanity";

export const PRODUCT_QUERY = defineQuery(`*[_type == "product"] {
  _id,
  _createdAt,
  name,
  description,
  image,
  price,
  category,
  dietaryType,
  hasSauceOptions,
  sauceOptions[] {
    name,
    price,
    isDefault
  }
}`);
