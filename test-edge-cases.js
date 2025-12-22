#!/usr/bin/env node
// Test edge cases for the Yuki invoice fixes

console.log("=== EDGE CASE TESTS ===\n");

// Edge Case 1: Division by zero
console.log("1. Zero quantity in selection:");
const selection1 = { subTotal: 10.90, quantity: 0 };
try {
  const unitPrice = (selection1.subTotal / selection1.quantity) / 1.09;
  const isFiniteValue = isFinite(unitPrice);
  console.log(`  Result: ${unitPrice} (${isFiniteValue ? 'OK' : 'ERROR: Infinity!'})`);
  console.log(isFiniteValue ? "  ⚠️  POTENTIAL ISSUE - Should validate quantity > 0" : "  ❌ CRITICAL - Would cause Infinity");
} catch (e) {
  console.log(`  ❌ FAIL - Exception: ${e.message}`);
}

// Edge Case 2: Null/undefined values
console.log("\n2. Undefined addon subTotal:");
const addon2 = { subTotal: undefined, quantity: 2 };
const unitPrice2 = ((addon2.subTotal || 0) / (addon2.quantity || 1)) / 1.09;
console.log(`  Result: €${unitPrice2.toFixed(2)}`);
console.log(unitPrice2 === 0 ? "  ✅ PASS - Safely defaults to 0" : "  ❌ FAIL");

// Edge Case 3: Negative values
console.log("\n3. Negative delivery cost:");
const deliveryCost3 = -10;
if (deliveryCost3 > 0) {
  console.log("  Would add delivery line");
  console.log("  ❌ FAIL - Would skip negative");
} else {
  console.log("  Would NOT add delivery line (> 0 check prevents it)");
  console.log("  ✅ PASS - Negative values safely ignored");
}

// Edge Case 4: Very small numbers causing rounding issues
console.log("\n4. Very small rounding difference:");
const storedTotal4 = 100.00;
const calculatedTotal4 = 99.999;
const diff4 = Math.abs(storedTotal4 - calculatedTotal4);
if (diff4 > 0.02) {
  console.log(`  Would add adjustment (diff: €${diff4.toFixed(3)})`);
  console.log("  ❌ FAIL - Should not adjust for tiny difference");
} else {
  console.log(`  Would NOT add adjustment (diff: €${diff4.toFixed(3)} ≤ €0.02)`);
  console.log("  ✅ PASS");
}

// Edge Case 5: Exactly 0.02 difference (boundary)
console.log("\n5. Exactly €0.02 difference (boundary):");
const storedTotal5 = 100.00;
const calculatedTotal5 = 100.02;
const diff5 = Math.abs(storedTotal5 - calculatedTotal5);
if (diff5 > 0.02) {
  console.log(`  Would add adjustment (diff: €${diff5.toFixed(2)})`);
  console.log("  ❌ FAIL");
} else {
  console.log(`  Would NOT add adjustment (diff: €${diff5.toFixed(2)} ≤ €0.02)`);
  console.log("  ✅ PASS - Boundary case handled correctly");
}

// Edge Case 6: Empty arrays
console.log("\n6. Empty drinksWithDetails array:");
const drinks6 = [];
let linesAdded6 = 0;
if (drinks6 && drinks6.length > 0) {
  drinks6.forEach(() => linesAdded6++);
}
console.log(`  Lines added: ${linesAdded6}`);
console.log(linesAdded6 === 0 ? "  ✅ PASS - Empty arrays handled safely" : "  ❌ FAIL");

// Edge Case 7: Missing optional fields
console.log("\n7. Missing optional orderData.deliveryDetails:");
const orderData7 = { deliveryCost: undefined };
const deliveryCost7 = orderData7.deliveryCost || orderData7.deliveryDetails?.deliveryCost || 0;
console.log(`  Delivery cost: €${deliveryCost7.toFixed(2)}`);
console.log(deliveryCost7 === 0 ? "  ✅ PASS - Missing nested field handled safely" : "  ❌ FAIL");

// Edge Case 8: NaN from invoiceAmount
console.log("\n8. Invalid invoiceAmount (NaN):");
const invoiceAmount8 = NaN;
if (invoiceAmount8 && typeof invoiceAmount8 === 'number') {
  console.log("  Would run validation");
  console.log("  ⚠️  POTENTIAL ISSUE - NaN passes typeof check!");
} else {
  console.log("  Would skip validation");
  console.log("  ✅ PASS");
}

// Edge Case 9: String invoiceAmount
console.log("\n9. Invalid invoiceAmount (string):");
const invoiceAmount9 = "100.00";
if (invoiceAmount9 && typeof invoiceAmount9 === 'number') {
  console.log("  Would run validation");
  console.log("  ❌ FAIL");
} else {
  console.log("  Would skip validation");
  console.log("  ✅ PASS - String correctly filtered out");
}

console.log("\n=== EDGE CASE TESTS COMPLETE ===");
