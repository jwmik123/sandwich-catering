/**
 * Migration script to set all products as active
 *
 * Run with: node scripts/activate-all-products.js
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
  process.exit(1)
}

// Initialize Sanity client
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
    // Fetch all products that don't have active field set
    console.log('📦 Fetching products...')
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

// Run the migration
activateAllProducts()
