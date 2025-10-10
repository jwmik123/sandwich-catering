# Implementation Guide: Dynamic Categories with Drag & Drop Ordering

This guide explains how to add dynamic categories and drag-and-drop product ordering to a Sanity-based Next.js project.

## Prerequisites

- Sanity v4+ installed
- Next.js project with Sanity integration
- Product schema already exists

## Step 1: Install Required Packages

```bash
npm install @sanity/orderable-document-list@latest sanity@latest @sanity/vision@latest next-sanity@latest --legacy-peer-deps
npm install dotenv --save-dev
```

## Step 2: Create Category Schema

Create `sanity/schemaTypes/categoryType.js`:

```javascript
import { defineField, defineType } from "sanity";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: "category" }),
    defineField({
      name: "name",
      title: "Category Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "Used in URLs and code (e.g., 'specials', 'breakfast')",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "slug.current",
    },
  },
});
```

## Step 3: Update Schema Index

In `sanity/schemaTypes/index.js`, add the category:

```javascript
import { product } from "./productType";
import { quote } from "./quoteType";
import { invoice } from "./invoiceType";
import { category } from "./categoryType"; // Add this

export const schema = {
  types: [category, product, quote, invoice], // Add category first
};
```

## Step 4: Update Product Schema

In `sanity/schemaTypes/productType.js`:

1. **Add imports at the top:**
```javascript
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
```

2. **Add orderings to the schema:**
```javascript
export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  orderings: [orderRankOrdering], // Add this
  fields: [
    orderRankField({ type: "product" }), // Add this as first field
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      description: "Uncheck to hide this product from the menu (keeps it in old orders)",
      initialValue: true,
    }),
    // ... rest of existing fields
  ],
});
```

3. **Replace the category field** (find the existing category field and replace it):

**OLD:**
```javascript
defineField({
  name: "category",
  title: "Category",
  type: "string",
  options: {
    list: [
      { title: "Specials", value: "specials" },
      // ... etc
    ],
  },
}),
```

**NEW:**
```javascript
defineField({
  name: "category",
  title: "Category",
  type: "reference",
  to: [{ type: "category" }],
  validation: (rule) => rule.required(),
}),
```

## Step 5: Update Sanity Structure

Replace `sanity/structure.js` with:

```javascript
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

      // All other document types
      ...S.documentTypeListItems().filter(
        (listItem) => !['product', 'category'].includes(listItem.getId())
      ),
    ])
```

## Step 6: Update Queries

In `sanity/lib/queries.js`:

**Update PRODUCT_QUERY:**
```javascript
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
  // ... rest of fields
}`);
```

**Add CATEGORY_QUERY:**
```javascript
export const CATEGORY_QUERY = defineQuery(`*[_type == "category"] | order(orderRank asc) {
  _id,
  name,
  "slug": slug.current,
  description,
  orderRank
}`);
```

## Step 7: Update Frontend Components

Find where products are filtered by category (usually in a component like `MenuCategories.jsx`):

**Update category extraction:**
```javascript
const uniqueCategories = useMemo(() => {
  const categoryMap = new Map();

  sandwichOptions.forEach((item) => {
    if (item.category && !categoryMap.has(item.category._id)) {
      categoryMap.set(item.category._id, {
        id: item.category._id,
        name: item.category.name,
        value: item.category.slug,
        slug: item.category.slug,
      });
    }
  });

  return Array.from(categoryMap.values());
}, [sandwichOptions]);
```

**Update filtering logic:**
```javascript
// OLD:
.filter((item) => item.category === category.value)

// NEW:
.filter((item) => item.category?.slug === category.value)
```

## Step 8: Create Migration Scripts

### Script 1: Migrate Categories (`scripts/migrate-categories.js`)

```javascript
import { createClient } from '@sanity/client'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.NEXT_PUBLIC_SANITY_DATASET || !process.env.SANITY_API_TOKEN) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

// UPDATE THIS MAPPING TO MATCH YOUR OLD CATEGORY VALUES
const categoryMapping = {
  'specials': 'specials',
  'basics': 'basics',
  'croissants': 'breakfast',
  'zoetigheden': 'sweets',
  'dranken': 'drinks',
  'fruit': 'fruit',
}

async function migrateCategories() {
  console.log('🚀 Starting category migration...\n')

  try {
    const categories = await client.fetch(
      `*[_type == "category"] { _id, name, "slug": slug.current }`
    )
    console.log(`Found ${categories.length} categories:`)
    categories.forEach(cat => console.log(`  - ${cat.name} (${cat.slug})`))

    const categoryLookup = {}
    categories.forEach(cat => {
      categoryLookup[cat.slug] = cat._id
    })

    const products = await client.fetch(
      `*[_type == "product" && !defined(category->)] { _id, name, category }`
    )
    console.log(`\nFound ${products.length} products to migrate`)

    if (products.length === 0) {
      console.log('\n✅ No products to migrate!')
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const product of products) {
      const oldCategory = product.category
      const newSlug = categoryMapping[oldCategory] || oldCategory
      const categoryId = categoryLookup[newSlug]

      if (!categoryId) {
        console.log(`  ❌ ${product.name}: No category found for "${oldCategory}" (mapped to "${newSlug}")`)
        errorCount++
        continue
      }

      try {
        await client
          .patch(product._id)
          .set({
            category: {
              _type: 'reference',
              _ref: categoryId,
            },
          })
          .commit()

        console.log(`  ✅ ${product.name}: ${oldCategory} → ${newSlug}`)
        successCount++
      } catch (error) {
        console.log(`  ❌ ${product.name}: Migration failed - ${error.message}`)
        errorCount++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`  ✅ Successful: ${successCount}`)
    console.log(`  ❌ Failed: ${errorCount}`)
    console.log(`  📋 Total: ${products.length}`)
    console.log('\n✨ Migration complete!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateCategories()
```

### Script 2: Activate Products (`scripts/activate-all-products.js`)

```javascript
import { createClient } from '@sanity/client'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.NEXT_PUBLIC_SANITY_DATASET || !process.env.SANITY_API_TOKEN) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

async function activateAllProducts() {
  console.log('🚀 Setting all products as active...\n')

  try {
    const products = await client.fetch(
      `*[_type == "product"] { _id, name, active }`
    )
    console.log(`Found ${products.length} products\n`)

    let updateCount = 0
    let skipCount = 0

    for (const product of products) {
      if (product.active === true) {
        console.log(`  ⏭️  ${product.name}: Already active`)
        skipCount++
        continue
      }

      try {
        await client
          .patch(product._id)
          .set({ active: true })
          .commit()

        console.log(`  ✅ ${product.name}: Set to active`)
        updateCount++
      } catch (error) {
        console.log(`  ❌ ${product.name}: Failed - ${error.message}`)
      }
    }

    console.log('\n📊 Summary:')
    console.log(`  ✅ Updated: ${updateCount}`)
    console.log(`  ⏭️  Already active: ${skipCount}`)
    console.log(`  📋 Total: ${products.length}`)
    console.log('\n✨ All products are now active!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

activateAllProducts()
```

## Step 9: Migration Process

1. **Get Sanity API Token:**
   - Go to https://www.sanity.io/manage
   - Select your project → API → Tokens
   - Add API token with **Editor** permissions
   - Add to `.env.local`: `SANITY_API_TOKEN=your_token_here`

2. **Create categories in Sanity Studio:**
   - Go to `/studio`
   - Click "Categories"
   - Create all your categories (e.g., Specials, Basics, Breakfast, etc.)
   - Note the slugs you create

3. **Update the category mapping:**
   - Edit `scripts/migrate-categories.js`
   - Update the `categoryMapping` object to match your old category strings to new slugs

4. **Run migrations:**
   ```bash
   node scripts/migrate-categories.js
   node scripts/activate-all-products.js
   ```

5. **Verify:**
   - Check Sanity Studio that products have category references
   - Check frontend that products display correctly
   - Test drag-and-drop ordering in Sanity Studio

## Step 10: Clean Up

After successful migration:
- Delete the API token from Sanity for security
- Remove migration scripts if no longer needed
- Test the application thoroughly

## Features After Implementation

✅ **Dynamic Categories:** Add/edit/remove categories without code changes
✅ **Drag & Drop Ordering:** Reorder products within each category
✅ **Active/Inactive Products:** Soft delete products (keeps historical data)
✅ **Category Filtering:** Products automatically grouped by category
✅ **Reference Integrity:** Products linked to categories, orders preserve product data

## Troubleshooting

**Issue: "Export useDocumentVersionInfo doesn't exist"**
- Solution: Update to Sanity v4+ with `npm install sanity@latest --legacy-peer-deps`

**Issue: Products not showing in frontend**
- Check: Are products marked as `active: true`?
- Run: `node scripts/activate-all-products.js`

**Issue: Migration script can't find projectId**
- Check: `.env.local` exists and has correct variables
- Check: `dotenv` package is installed

**Issue: Can't delete products (reference error)**
- This is expected! Use the "Active" checkbox instead of deleting
- Uncheck "Active" to hide from menu while preserving order history
