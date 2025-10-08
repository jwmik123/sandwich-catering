import { product } from "./productType";
import { quote } from "./quoteType";
import { invoice } from "./invoiceType";
import { category } from "./categoryType";

export const schema = {
  types: [category, product, quote, invoice],
};
