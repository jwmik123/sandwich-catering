import { product } from "./productType";
import { quote } from "./quoteType";
import { invoice } from "./invoiceType";
import { category } from "./categoryType";
import { drink } from "./drinkType";

export const schema = {
  types: [category, product, drink, quote, invoice],
};
