/**
 * Migration script to convert string categories to category references
 *
 * Run with: node scripts/migrate-categories.js
 */

import { createClient } from '@sanity/client'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
config({ path: join(__dirname, '..', '.env.local') })

// Verify required env vars
if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SANITY_DATASET) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_DATASET in .env.local')
  process.exit(1)
}

if (!process.env.SANITY_API_TOKEN) {
  console.error('❌ Missing SANITY_API_TOKEN in .env.local')
  console.error('   Get a token from: https://www.sanity.io/manage')
  process.exit(1)
}

// Initialize Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
})

// Mapping of old string values to new category slugs
const categoryMapping = {
  'specials': 'specials',
  'basics': 'basics',
  'breakfast': 'other', // Update this if your slug is different
  'zoetigheden': 'sweets',
  'dranken': 'drinks',
  'fruit': 'other',
}

async function migrateCategories() {
  console.log('🚀 Starting category migration...\n')

  try {
    // Fetch all categories
    console.log('📋 Fetching categories...')
    const categories = await client.fetch(
      `*[_type == "category"] { _id, name, "slug": slug.current }`
    )
    console.log(`Found ${categories.length} categories:`)
    categories.forEach(cat => console.log(`  - ${cat.name} (${cat.slug})`))

    // Create a lookup map
    const categoryLookup = {}
    categories.forEach(cat => {
      categoryLookup[cat.slug] = cat._id
    })

    // Fetch all products with string categories
    console.log('\n📦 Fetching products with old category format...')
    const products = await client.fetch(
      `*[_type == "product" && !defined(category->)] { _id, name, category }`
    )
    console.log(`Found ${products.length} products to migrate`)

    if (products.length === 0) {
      console.log('\n✅ No products to migrate!')
      return
    }

    // Migrate each product
    console.log('\n🔄 Migrating products...')
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

// Run the migration
migrateCategories()
