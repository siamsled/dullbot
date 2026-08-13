import { generatePrintHTML, PrintableOrder, ReceiptCustomConfig } from '../src/lib/receipt-generator';
import { TOP_20_LANGUAGES } from '../src/lib/languages';

console.log('\n======================================================');
console.log('  STARTING RECEIPT & LANGUAGE SETTINGS AUDIT TESTS');
console.log('======================================================\n');

// 1. Test Top 20 Languages Catalog
console.log(`[TEST 1] Verifying Top 20 Languages Catalog...`);
if (TOP_20_LANGUAGES.length === 20) {
  console.log(`  ✓ Exactly 20 top spoken languages defined.`);
} else {
  console.error(`  ✗ Expected 20 languages, found ${TOP_20_LANGUAGES.length}`);
  process.exit(1);
}

const sampleLangs = TOP_20_LANGUAGES.slice(0, 5).map(l => `${l.name} (${l.native}) ${l.flag}`).join(', ');
console.log(`  ✓ Sample languages: ${sampleLangs}`);

// 2. Test Receipt Generator (80mm Thermal & A4 Color)
const testOrder: PrintableOrder = {
  id: 'dull-test-99201',
  createdAt: new Date().toISOString(),
  customerName: 'Rahim Chowdhury',
  customerPhone: '+880 1819-112233',
  customerAddress: 'Gulshan 2, Dhaka',
  totalAmount: 4500,
  paymentMethod: 'bkash',
  paymentTransactionRef: 'TRX-BKASH-88219',
  courierProvider: 'Pathao',
  courierTrackingId: 'PTH-992182',
  lineItems: [
    { product_name: 'Custom Tailored Suit Jacket', quantity: 1, unit_price: 3500 },
    { product_name: 'Silk Tie (Emerald Green)', quantity: 2, unit_price: 500 },
  ],
};

const customConfig: ReceiptCustomConfig = {
  storeName: 'Siam Luxury Clothiers',
  tagline: 'Bespoke Formal & Traditional Wear',
  phone: '+880 1711-001122',
  address: 'Level 4, Gulshan Avenue, Dhaka',
  websiteOrSocial: 'instagram.com/siamclothiers',
  accentColor: '#059669', // Emerald
  footerNote: 'Thank you for choosing Siam Luxury Clothiers!',
  termsNote: 'Custom bespoke items are non-refundable after trial fitting.',
};

console.log('\n[TEST 2] Generating 80mm Thermal POS Receipt...');
const thermalHTML = generatePrintHTML([testOrder], 'receipt', 1, 'thermal_80mm', customConfig);
if (thermalHTML.includes('Siam Luxury Clothiers') && thermalHTML.includes('80mm')) {
  console.log('  ✓ 80mm POS Thermal receipt HTML generated successfully.');
} else {
  console.error('  ✗ Thermal receipt missing expected content.');
  process.exit(1);
}

console.log('\n[TEST 3] Generating A4 Modern Color Invoice with Custom Accent Color...');
const a4HTML = generatePrintHTML([testOrder], 'receipt', 1, 'a4', customConfig);
if (
  a4HTML.includes('Siam Luxury Clothiers') &&
  a4HTML.includes('INVOICE') &&
  a4HTML.includes('#059669') &&
  a4HTML.includes('210mm')
) {
  console.log('  ✓ A4 Modern Color Invoice generated with custom Emerald (#059669) accent color.');
} else {
  console.error('  ✗ A4 Color Invoice missing expected markup or custom accent.');
  process.exit(1);
}

console.log('\n======================================================');
console.log('  ALL RECEIPT & LANGUAGE TESTS PASSED (3/3)!');
console.log('======================================================\n');
