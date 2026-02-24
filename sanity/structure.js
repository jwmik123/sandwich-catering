// https://www.sanity.io/docs/structure-builder-cheat-sheet
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'

export const structure = (S, context) =>
  S.list()
    .title('Content')
    .items([
      // Categories management
      orderableDocumentListDeskItem({
        type: 'category',
        title: 'Categories',
        id: 'orderable-categories',
        S,
        context,
      }),

      S.divider(),

      // Dynamic Products list by category
      S.listItem()
        .title('Products')
        .child(async () => {
          // Fetch categories to build dynamic structure
          const categories = await context.getClient({ apiVersion: '2024-01-01' }).fetch(
            `*[_type == "category"] | order(orderRank asc) { _id, name, "slug": slug.current }`
          )

          return S.list()
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

              // Dynamically create category items
              ...categories.map((cat) =>
                orderableDocumentListDeskItem({
                  type: 'product',
                  title: cat.name,
                  id: `orderable-products-${cat.slug}`,
                  filter: `category._ref == $categoryId`,
                  params: { categoryId: cat._id },
                  S,
                  context,
                })
              ),
            ])
        }),

      S.divider(),

      // All other document types (excluding singletons handled manually)
      ...S.documentTypeListItems().filter(
        (listItem) => !['product', 'category', 'siteSettings'].includes(listItem.getId())
      ),

      S.divider(),

      // Site Settings singleton
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings')
        ),
    ])
