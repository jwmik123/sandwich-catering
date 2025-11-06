import { product } from "./productType";
import { quote } from "./quoteType";
import { invoice } from "./invoiceType";
import { category } from "./categoryType";
import { drink } from "./drinkType";
import { popupConfig } from "./popupConfigType";

export const schema = {
  types: [category, product, drink, quote, invoice, popupConfig],
};
