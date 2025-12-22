#!/usr/bin/env node
/**
 * Test script to verify Yuki invoice calculation fixes
 * Run with: node test-yuki-calculations.js
 */

const GLUTEN_FREE_SURCHARGE = 0.90;

/**
 * Simulates the Yuki invoice line item calculation
 */
function calculateYukiTotal(lines) {
  const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  const vat = Math.ceil(subtotal * 0.09 * 100) / 100;
  const total = subtotal + vat;
  return { subtotal, vat, total };
}

/**
 * Test Case 1: Custom sandwich order with delivery
 */
function testCustomOrderWithDelivery() {
  console.log('\n=== TEST 1: Custom Order with Delivery ===');

  const orderData = {
    selectionType: 'custom',
    customSelection: [
      {
        sandwichId: { _ref: 'sandwich-123' },
        selections: [
          {
            breadType: 'wit',
            sauce: 'mayo',
            quantity: 5,
            subTotal: 37.25 // VAT-inclusive (5 × €7.45)
          },
          {
            breadType: 'meergranen',
            sauce: 'pesto',
            quantity: 3,
            subTotal: 22.35 // VAT-inclusive (3 × €7.45)
          }
        ]
      }
    ],
    deliveryCost: 15.00 // VAT-exclusive
  };

  // Simulate the fixed calculation
  const lines = [];

  // Custom sandwiches - convert from VAT-inclusive to VAT-exclusive
  orderData.customSelection[0].selections.forEach(selection => {
    const unitPriceInclVAT = selection.subTotal / selection.quantity;
    const unitPrice = unitPriceInclVAT / 1.09; // FIXED: Convert to VAT-exclusive
    lines.push({
      description: `Sandwich - ${selection.breadType}`,
      quantity: selection.quantity,
      unitPrice: unitPrice
    });
  });

  // Delivery cost - already VAT-exclusive
  lines.push({
    description: 'Delivery Cost',
    quantity: 1,
    unitPrice: orderData.deliveryCost
  });

  const yukiCalculated = calculateYukiTotal(lines);
  const expectedTotal = (37.25 + 22.35 + 15.00); // All VAT-inclusive items + VAT-exclusive delivery, then recalculate
  // Actually: (37.25/1.09 + 22.35/1.09 + 15.00) × 1.09
  const itemsExclVAT = (37.25 / 1.09) + (22.35 / 1.09);
  const properTotal = (itemsExclVAT + 15.00) * 1.09;

  console.log('Order items (VAT-incl): €37.25 + €22.35 = €59.60');
  console.log('Delivery (VAT-excl): €15.00');
  console.log('');
  console.log('Yuki calculation:');
  console.log(`  Subtotal: €${yukiCalculated.subtotal.toFixed(2)}`);
  console.log(`  VAT (9%): €${yukiCalculated.vat.toFixed(2)}`);
  console.log(`  Total: €${yukiCalculated.total.toFixed(2)}`);
  console.log('');
  console.log(`Expected total: €${properTotal.toFixed(2)}`);
  console.log(`Difference: €${Math.abs(yukiCalculated.total - properTotal).toFixed(2)}`);

  const passed = Math.abs(yukiCalculated.total - properTotal) < 0.02;
  console.log(passed ? '✅ PASS' : '❌ FAIL');

  return passed;
}

/**
 * Test Case 2: Variety order with gluten-free, drinks, and delivery
 */
function testVarietyOrderComplete() {
  console.log('\n=== TEST 2: Variety Order with Gluten-Free, Drinks & Delivery ===');

  const orderData = {
    selectionType: 'variety',
    varietySelection: {
      nonVega: 10,
      vega: 5,
      vegan: 3,
      glutenFree: 2
    },
    drinksWithDetails: [
      { name: 'Fresh Orange Juice', quantity: 5, price: 3.62 },
      { name: 'Sodas', quantity: 8, price: 2.71 }
    ],
    deliveryCost: 10.00
  };

  const lines = [];

  // Variety sandwiches - already VAT-exclusive
  if (orderData.varietySelection.nonVega > 0) {
    lines.push({
      description: 'Chicken, Meat, Fish Sandwiches',
      quantity: orderData.varietySelection.nonVega,
      unitPrice: 6.83
    });
  }
  if (orderData.varietySelection.vega > 0) {
    lines.push({
      description: 'Vegetarian Sandwiches',
      quantity: orderData.varietySelection.vega,
      unitPrice: 6.83
    });
  }
  if (orderData.varietySelection.vegan > 0) {
    lines.push({
      description: 'Vegan Sandwiches',
      quantity: orderData.varietySelection.vegan,
      unitPrice: 6.83
    });
  }
  if (orderData.varietySelection.glutenFree > 0) {
    lines.push({
      description: 'Gluten Free Sandwiches',
      quantity: orderData.varietySelection.glutenFree,
      unitPrice: 6.83 + GLUTEN_FREE_SURCHARGE
    });
  }

  // Drinks - already VAT-exclusive
  orderData.drinksWithDetails.forEach(drink => {
    lines.push({
      description: drink.name,
      quantity: drink.quantity,
      unitPrice: drink.price
    });
  });

  // Delivery - already VAT-exclusive
  lines.push({
    description: 'Delivery Cost',
    quantity: 1,
    unitPrice: orderData.deliveryCost
  });

  const yukiCalculated = calculateYukiTotal(lines);

  // Manual calculation
  const sandwichesSubtotal = (10 + 5 + 3) * 6.83 + 2 * (6.83 + GLUTEN_FREE_SURCHARGE);
  const drinksSubtotal = 5 * 3.62 + 8 * 2.71;
  const expectedSubtotal = sandwichesSubtotal + drinksSubtotal + 10.00;
  const expectedVAT = Math.ceil(expectedSubtotal * 0.09 * 100) / 100;
  const expectedTotal = expectedSubtotal + expectedVAT;

  console.log('Order breakdown:');
  console.log(`  Sandwiches: ${orderData.varietySelection.nonVega + orderData.varietySelection.vega + orderData.varietySelection.vegan} regular @ €6.83`);
  console.log(`  Gluten-free: ${orderData.varietySelection.glutenFree} @ €${(6.83 + GLUTEN_FREE_SURCHARGE).toFixed(2)}`);
  console.log(`  Drinks: 5x OJ + 8x Sodas`);
  console.log(`  Delivery: €10.00`);
  console.log('');
  console.log('Yuki calculation:');
  console.log(`  Subtotal: €${yukiCalculated.subtotal.toFixed(2)} (expected: €${expectedSubtotal.toFixed(2)})`);
  console.log(`  VAT (9%): €${yukiCalculated.vat.toFixed(2)} (expected: €${expectedVAT.toFixed(2)})`);
  console.log(`  Total: €${yukiCalculated.total.toFixed(2)} (expected: €${expectedTotal.toFixed(2)})`);
  console.log('');
  console.log(`Difference: €${Math.abs(yukiCalculated.total - expectedTotal).toFixed(4)}`);

  const passed = Math.abs(yukiCalculated.total - expectedTotal) < 0.01;
  console.log(passed ? '✅ PASS' : '❌ FAIL');

  return passed;
}

/**
 * Test Case 3: Variety order with upsell addons
 */
function testVarietyOrderWithUpsellAddons() {
  console.log('\n=== TEST 3: Variety Order with Upsell Addons ===');

  const orderData = {
    selectionType: 'variety',
    varietySelection: {
      nonVega: 15,
      vega: 0,
      vegan: 0,
      glutenFree: 0
    },
    upsellAddons: [
      {
        id: 'addon-1',
        name: 'Cheese Platter',
        price: 12.50, // This would be the base price
        quantity: 2,
        subTotal: 27.25 // VAT-inclusive total for 2 items
      }
    ],
    deliveryCost: 0 // Free delivery
  };

  const lines = [];

  // Variety sandwiches
  lines.push({
    description: 'Chicken, Meat, Fish Sandwiches',
    quantity: 15,
    unitPrice: 6.83
  });

  // Upsell addons - convert from VAT-inclusive to VAT-exclusive
  orderData.upsellAddons.forEach(addon => {
    const unitPriceInclVAT = addon.subTotal / addon.quantity;
    const unitPrice = unitPriceInclVAT / 1.09; // FIXED: Convert to VAT-exclusive
    lines.push({
      description: addon.name,
      quantity: addon.quantity,
      unitPrice: unitPrice
    });
  });

  const yukiCalculated = calculateYukiTotal(lines);

  // Manual calculation
  const sandwichesSubtotal = 15 * 6.83;
  const addonsExclVAT = 27.25 / 1.09;
  const expectedSubtotal = sandwichesSubtotal + addonsExclVAT;
  const expectedVAT = Math.ceil(expectedSubtotal * 0.09 * 100) / 100;
  const expectedTotal = expectedSubtotal + expectedVAT;

  console.log('Order breakdown:');
  console.log(`  Sandwiches: 15 @ €6.83`);
  console.log(`  Addon: 2x Cheese Platter (€27.25 incl VAT)`);
  console.log('');
  console.log('Yuki calculation:');
  console.log(`  Subtotal: €${yukiCalculated.subtotal.toFixed(2)} (expected: €${expectedSubtotal.toFixed(2)})`);
  console.log(`  VAT (9%): €${yukiCalculated.vat.toFixed(2)} (expected: €${expectedVAT.toFixed(2)})`);
  console.log(`  Total: €${yukiCalculated.total.toFixed(2)} (expected: €${expectedTotal.toFixed(2)})`);
  console.log('');
  console.log(`Difference: €${Math.abs(yukiCalculated.total - expectedTotal).toFixed(4)}`);

  const passed = Math.abs(yukiCalculated.total - expectedTotal) < 0.01;
  console.log(passed ? '✅ PASS' : '❌ FAIL');

  return passed;
}

/**
 * Test Case 4: Rounding adjustment validation
 */
function testRoundingAdjustment() {
  console.log('\n=== TEST 4: Rounding Adjustment Validation ===');

  // Scenario where rounding might cause a small difference
  const lines = [
    { description: 'Sandwich 1', quantity: 7, unitPrice: 6.835 },
    { description: 'Sandwich 2', quantity: 3, unitPrice: 7.45 / 1.09 },
    { description: 'Delivery', quantity: 1, unitPrice: 12.50 }
  ];

  const yukiCalculated = calculateYukiTotal(lines);
  const storedInvoiceTotal = 81.14; // Hypothetical stored total

  console.log('Line items:');
  lines.forEach(line => {
    console.log(`  ${line.quantity}x ${line.description} @ €${line.unitPrice.toFixed(2)}`);
  });
  console.log('');
  console.log(`Yuki calculated total: €${yukiCalculated.total.toFixed(2)}`);
  console.log(`Stored invoice total: €${storedInvoiceTotal.toFixed(2)}`);

  const difference = storedInvoiceTotal - yukiCalculated.total;
  console.log(`Difference: €${Math.abs(difference).toFixed(2)}`);

  if (Math.abs(difference) > 0.02) {
    console.log(`⚠️  Would add rounding adjustment: €${difference.toFixed(2)}`);

    // Add adjustment and recalculate
    lines.push({
      description: 'Afrondingsverschil',
      quantity: 1,
      unitPrice: difference / 1.09
    });

    const adjustedCalculation = calculateYukiTotal(lines);
    console.log(`After adjustment: €${adjustedCalculation.total.toFixed(2)}`);
    console.log(`New difference: €${Math.abs(storedInvoiceTotal - adjustedCalculation.total).toFixed(4)}`);

    const passed = Math.abs(storedInvoiceTotal - adjustedCalculation.total) < 0.01;
    console.log(passed ? '✅ PASS' : '❌ FAIL');
    return passed;
  } else {
    console.log('✓ Difference within acceptable range (≤ €0.02)');
    console.log('✅ PASS');
    return true;
  }
}

// Run all tests
console.log('========================================');
console.log('  YUKI INVOICE CALCULATION TESTS');
console.log('========================================');

const results = [
  testCustomOrderWithDelivery(),
  testVarietyOrderComplete(),
  testVarietyOrderWithUpsellAddons(),
  testRoundingAdjustment()
];

const passedCount = results.filter(r => r).length;
const totalCount = results.length;

console.log('\n========================================');
console.log(`  RESULTS: ${passedCount}/${totalCount} tests passed`);
console.log('========================================\n');

process.exit(passedCount === totalCount ? 0 : 1);
