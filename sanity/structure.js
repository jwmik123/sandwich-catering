// https://www.sanity.io/docs/structure-builder-cheat-sheet
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'

export const structure = (S, context) =>
  S.list()
    .title('Content')
    .items([
      // Custom Products list with category grouping and drag-and-drop
      S.listItem()
        .title('Products')
        .child(
          S.list()
            .title('Products by Category')
            .items([
              // All products with drag-and-drop
              orderableDocumentListDeskItem({
                type: 'product',
                title: 'All Products',
                id: 'orderable-products-all',
                S,
                context,
              }),

              S.divider(),

              // Specials with drag-and-drop
              orderableDocumentListDeskItem({
                type: 'product',
                title: 'Specials',
                id: 'orderable-products-specials',
                filter: 'category == "specials"',
                S,
                context,
              }),

              // Basics with drag-and-drop
              orderableDocumentListDeskItem({
                type: 'product',
                title: 'Basics',
                id: 'orderable-products-basics',
                filter: 'category == "basics"',
                S,
                context,
              }),

              // Breakfast with drag-and-drop
              orderableDocumentListDeskItem({
                type: 'product',
                title: 'Breakfast',
                id: 'orderable-products-breakfast',
                filter: 'category == "croissants"',
                S,
                context,
              }),

              // Zoetigheden with drag-and-drop
              orderableDocumentListDeskItem({
                type: 'product',
                title: 'Zoetigheden',
                id: 'orderable-products-zoetigheden',
                filter: 'category == "zoetigheden"',
                S,
                context,
              }),

              // Dranken with drag-and-drop
              orderableDocumentListDeskItem({
                type: 'product',
                title: 'Dranken',
                id: 'orderable-products-dranken',
                filter: 'category == "dranken"',
                S,
                context,
              }),

              // Fruit with drag-and-drop
              orderableDocumentListDeskItem({
                type: 'product',
                title: 'Fruit',
                id: 'orderable-products-fruit',
                filter: 'category == "fruit"',
                S,
                context,
              }),
            ])
        ),

      S.divider(),

      // All other document types
      ...S.documentTypeListItems().filter(
        (listItem) => !['product'].includes(listItem.getId())
      ),
    ])
