import { defineQuery } from "next-sanity";

export const PRODUCT_QUERY = defineQuery(`*[_type == "product"] | order(orderRank asc) {
  _id,
  _createdAt,
  name,
  description,
  image,
  allergyInfo,
  allergyNotes,
  price,
  category->{
    _id,
    name,
    "slug": slug.current,
    description
  },
  dietaryType,
  orderRank,
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

export const CATEGORY_QUERY = defineQuery(`*[_type == "category"] | order(orderRank asc) {
  _id,
  name,
  "slug": slug.current,
  description,
  orderRank
}`);
