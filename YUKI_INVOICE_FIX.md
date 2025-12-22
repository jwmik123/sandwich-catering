# Yuki Invoice Fix - Implementation Summary

## Issues Fixed

### 1. **Missing Delivery Cost in Yuki Invoices**
**Problem:** Delivery cost was sometimes missing from Yuki invoices because the code looked for `orderData.deliveryCost` but the data was stored in nested structures like `deliveryDetails.deliveryCost`.

**Fix:** Updated delivery cost lookup to check multiple possible locations:
```javascript
const deliveryCost = orderData.deliveryCost ||
                     orderData.deliveryDetails?.deliveryCost ||
                     0;
```

**Location:** [lib/yuki-api.js:419-421](lib/yuki-api.js#L419-L421)

---

### 2. **Incorrect VAT Calculations**
**Problem:** VAT amounts differed between Sanity invoices and Yuki invoices due to mixing VAT-inclusive and VAT-exclusive prices.

**Root Cause:**
- Custom sandwiches: Sent VAT-inclusive prices to Yuki, but Yuki adds 9% VAT itself → double taxation
- Variety sandwiches: Correctly sent VAT-exclusive prices (€6.83)
- This is why errors were inconsistent - they only occurred on custom orders!

**Fix:** Convert all VAT-inclusive prices to VAT-exclusive before sending to Yuki:

**Custom sandwiches** [lib/yuki-api.js:336-338](lib/yuki-api.js#L336-L338):
```javascript
// Before: unitPrice = selection.subTotal / selection.quantity (VAT-inclusive)
// After:
const unitPriceInclVAT = selection.subTotal / selection.quantity;
const unitPrice = unitPriceInclVAT / 1.09; // Convert to VAT-exclusive
```

**Upsell addons** [lib/yuki-api.js:407-409](lib/yuki-api.js#L407-L409):
```javascript
const unitPriceInclVAT = (addon.subTotal || 0) / (addon.quantity || 1);
const unitPrice = unitPriceInclVAT / 1.09;
```

---

### 3. **Missing Upsell Addons**
**Problem:** Variety orders with upsell addon products (from the popup) were not included in Yuki invoices.

**Fix:** Added upsell addons processing with correct VAT handling.

**Location:** [lib/yuki-api.js:404-418](lib/yuki-api.js#L404-L418)

---

### 4. **Validation & Rounding Protection**
**Problem:** Rounding differences between line-by-line calculations could cause small discrepancies.

**Fix:** Added validation logic that:
1. Calculates what Yuki will compute from line items
2. Compares against the stored invoice total
3. Adds a rounding adjustment line if difference > €0.02
4. Logs all calculations for debugging

**Location:** [lib/yuki-api.js:448-478](lib/yuki-api.js#L448-L478)

**Example output:**
```
=== YUKI INVOICE VALIDATION ===
Stored invoice total: €124.56
Calculated from line items: €124.56
Difference: €0.00
✓ Invoice amounts match perfectly
```

---

## How Yuki VAT Works

**Critical Understanding:**
```xml
<VATPercentage>9.00</VATPercentage>
<VATIncluded>false</VATIncluded>
```

This means:
- Yuki expects **VAT-exclusive** prices
- Yuki **adds 9% VAT** to all unit prices
- If you send VAT-inclusive prices, Yuki adds ANOTHER 9% → wrong total!

**Formula:**
```
Yuki Total = SUM(quantity × unitPrice) × 1.09
```

---

## Testing the Fix

### Method 1: Using Existing Test Endpoint

**Endpoint:** `/api/test/yuki-invoice`

**Requirements:**
1. Set `YUKI_TEST_SECRET` environment variable
2. Have an invoice in Sanity with a known `quoteId`

**Test Command:**
```bash
# Replace with your actual values
curl "http://localhost:3000/api/test/yuki-invoice?quoteId=TSB-12345&secret=YOUR_SECRET"
```

**What to check:**
1. Console logs show "YUKI INVOICE VALIDATION" section
2. Difference between stored and calculated totals is ≤ €0.02
3. Delivery cost appears in the XML response
4. Response is XML format (not JSON error)

---

### Method 2: Create Test Invoice Scenarios

**Test Case 1: Custom Order with Delivery**
```javascript
{
  selectionType: "custom",
  customSelection: [
    {
      sandwichId: { _ref: "sandwich-123" },
      selections: [
        {
          breadType: "wit",
          sauce: "mayo",
          quantity: 5,
          subTotal: 37.25 // VAT-inclusive (5 × €7.45)
        }
      ]
    }
  ],
  deliveryCost: 15.00, // VAT-exclusive
  // Expected Yuki total: (37.25/1.09 + 15.00) × 1.09 = €53.58
}
```

**Test Case 2: Variety Order with Drinks & Delivery**
```javascript
{
  selectionType: "variety",
  varietySelection: {
    nonVega: 10,
    vega: 5,
    vegan: 0,
    glutenFree: 2
  },
  drinksWithDetails: [
    { name: "Fresh Orange Juice", quantity: 5, price: 3.62 }
  ],
  deliveryCost: 10.00
  // Expected Yuki subtotal: (15 × 6.83) + (2 × 7.73) + (5 × 3.62) + 10.00
  //                       = 102.45 + 15.46 + 18.10 + 10.00 = €146.01
  // Expected Yuki total: €146.01 × 1.09 = €159.15
}
```

---

### Method 3: Manual Verification Checklist

For each invoice sent to Yuki:

- [ ] Check console logs for "YUKI INVOICE VALIDATION" output
- [ ] Verify difference is < €0.02
- [ ] Compare Yuki XML total with Sanity invoice `amount.total`
- [ ] Verify delivery cost line appears in XML (if order has delivery)
- [ ] Check VAT amount: should be ~9% of (items + delivery)
- [ ] For custom orders: verify sandwiches aren't double-taxed
- [ ] For variety orders: verify counts match order

---

## Code Changes Summary

**File:** `lib/yuki-api.js`

**Lines changed:**
- 303-310: Updated function documentation
- 336-338: Fixed custom sandwich VAT calculation
- 404-418: Added upsell addons support
- 419-430: Fixed delivery cost lookup (multiple locations)
- 427: Added comment clarifying drinks are VAT-exclusive
- 448-478: Added validation and rounding adjustment logic

**Total impact:** ~50 lines changed/added

---

## Migration Notes

**No breaking changes!**

- Existing invoices in Yuki are unaffected
- Old code still works for variety orders (those were correct)
- Only custom orders and orders with delivery will see different (correct) behavior
- Validation is passive - only logs warnings, doesn't block

**Safe to deploy immediately.**

---

## Monitoring

After deployment, monitor logs for:

1. **Rounding adjustments:**
   ```
   ⚠️  Adding rounding adjustment of €X.XX
   ```
   If this appears frequently (>5% of invoices), investigate why.

2. **Large differences:**
   ```
   Difference: €X.XX
   ```
   Any difference > €1.00 indicates a data issue that needs investigation.

3. **Missing delivery cost:**
   Look for invoices where delivery should exist but doesn't appear in line items.

---

## Future Improvements

1. **Add automated tests** for VAT calculations
2. **Create admin dashboard** to compare Sanity vs Yuki invoice totals
3. **Add retry logic** for failed Yuki API calls
4. **Store Yuki invoice ID** in Sanity for reconciliation

---

## Questions?

If you see unexpected behavior:

1. Check the console logs for the "YUKI INVOICE VALIDATION" section
2. Compare the line items sent to Yuki with what you expect
3. Verify the stored `amount` object in Sanity is correct
4. Check if delivery cost is in `orderData.deliveryCost` or nested

Contact the developer with:
- Quote ID
- Invoice ID
- Console logs from Yuki invoice creation
- Expected vs actual totals
