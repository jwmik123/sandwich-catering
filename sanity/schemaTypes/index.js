import { product } from "./productType";
import { quote } from "./quoteType";
import { invoice } from "./invoiceType";
import { invoiceCounter } from "./invoiceCounterType";
import { creditNote } from "./creditNoteType";
import { category } from "./categoryType";
import { drink } from "./drinkType";
import { popupConfig } from "./popupConfigType";
import { siteSettings } from "./siteSettingsType";

export const schema = {
  types: [category, product, drink, quote, invoice, creditNote, invoiceCounter, popupConfig, siteSettings],
};
