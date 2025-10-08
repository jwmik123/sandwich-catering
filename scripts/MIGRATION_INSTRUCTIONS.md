# Category Migration Instructions

## Prerequisites

1. **Get a Sanity API Token:**
   - Go to https://www.sanity.io/manage
   - Select your project
   - Go to "API" → "Tokens"
   - Click "Add API token"
   - Name: `Migration Token`
   - Permissions: **Editor** (write access)
   - Copy the token

2. **Add token to .env.local:**
   ```bash
   SANITY_API_TOKEN=your_token_here
   ```

## Running the Migration

1. **Review the category mapping** in `scripts/migrate-categories.js`:
   ```javascript
   const categoryMapping = {
     'specials': 'specials',
     'basics': 'basics',
     'croissants': 'breakfast', // Update this if your slug is different
     'zoetigheden': 'zoetigheden',
     'dranken': 'dranken',
     'fruit': 'fruit',
   }
   ```

   Update the **right side** to match the slugs of the categories you created in Sanity.

2. **Run the migration:**
   ```bash
   node scripts/migrate-categories.js
   ```

3. **Verify in Sanity Studio:**
   - Go to `/studio`
   - Check that products now have proper category references
   - Check that Products → Categories shows products in correct categories

## What the script does

- Fetches all categories from Sanity
- Finds all products with old string-based categories
- Maps old category strings to new category references
- Updates each product with the new category reference
- Shows a summary of successful and failed migrations

## Troubleshooting

**"No category found" error:**
- Make sure the slugs in `categoryMapping` match your Sanity categories exactly
- Check that you created all necessary categories in Sanity Studio

**"Migration failed" error:**
- Verify your API token has Editor permissions
- Check that the token is correctly set in .env.local

## After Migration

You can delete the API token from Sanity for security:
- Go to Sanity Manage → API → Tokens
- Delete the "Migration Token"
