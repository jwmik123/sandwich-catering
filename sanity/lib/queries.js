import { defineQuery } from "next-sanity";

export const PRODUCT_QUERY = defineQuery(`*[_type == "product" && active == true] | order(orderRank asc) {
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

export const DRINK_QUERY = defineQuery(`*[_type == "drink" && active == true] | order(orderRank asc) {
  _id,
  name,
  "slug": slug.current,
  price,
  description,
  orderRank
}`);

export const POPUP_CONFIG_QUERY = defineQuery(`*[_type == "popupConfig" && active == true][0] {
  _id,
  active,
  popupTitle,
  popupDescription,
  products[]->{
    _id,
    name,
    description,
    image,
    price,
    hasToppings,
    toppingOptions[] {
      name,
      price,
      isDefault
    },
    category->{
      _id,
      name,
      "slug": slug.current
    }
  }
}`);
