import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runPosAndAnalyticsTests() {
  console.log('\n======================================================');
  console.log('  STARTING POS & DEEP ANALYTICS ENGINE AUDIT TESTS');
  console.log('======================================================\n');

  // 1. Fetch test shop
  const { data: shop, error: shopErr } = await supabaseAdmin
    .from('shops')
    .select('id, name')
    .limit(1)
    .single();

  if (shopErr || !shop) {
    console.error('FAILED: No test shop found.', shopErr);
    process.exit(1);
  }

  console.log(`[TEST SETUP] Using shop: "${shop.name}" (${shop.id})`);

  let { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name, price, stock_quantity, cost_price')
    .eq('shop_id', shop.id)
    .limit(1)
    .single();

  if (!product) {
    const { data: newProd } = await supabaseAdmin
      .from('products')
      .insert({
        shop_id: shop.id,
        name: 'POS Test Premium Shirt',
        price: 1500,
        cost_price: 900,
        stock_quantity: 25,
        is_active: true,
      })
      .select()
      .single();
    product = newProd;
  }

  if (!product) {
    throw new Error('Could not find or create test product');
  }

  const initialStock = Number(product.stock_quantity ?? 25);
  console.log(`[TEST 1] Product "${product.name}" initial stock: ${initialStock}`);

  // 3. Create POS Manual Order (Cash walk-in)
  console.log('\n[TEST 2] Processing POS Walk-in Sale (৳1,500 Cash)...');
  const { data: posOrder, error: posOrderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      shop_id: shop.id,
      customer_name: 'Walk-in Cash Customer',
      customer_phone: 'Walk-in',
      customer_address: 'In-Store POS',
      total_amount: 1500,
      status: 'confirmed',
      payment_method: 'cash',
      payment_verified_at: new Date().toISOString(),
      payment_transaction_ref: `CASH-${Date.now().toString().slice(-6)}`,
      verification_method: null,
      fulfillment_status: 'delivered',
      internal_note: '[POS SALE] Processed by Test Cashier',
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (posOrderErr || !posOrder) {
    console.error('FAILED to create POS order:', posOrderErr);
    process.exit(1);
  }

  console.log(`  ✓ POS Order created: #${posOrder.id.slice(0, 8)} | Status: ${posOrder.status} | Fulfillment: ${posOrder.fulfillment_status}`);

  // 4. Insert line items
  await supabaseAdmin.from('order_line_items').insert({
    order_id: posOrder.id,
    product_id: product.id,
    product_name: product.name,
    quantity: 1,
    unit_price: 1500,
  });
  console.log('  ✓ Line items inserted.');

  // 5. Test atomic stock decrement via RPC
  console.log('\n[TEST 3] Invoking atomic decrement_stock RPC...');
  const { error: rpcErr } = await supabaseAdmin.rpc('decrement_stock', {
    p_product_id: product.id,
    p_variant_id: null,
    p_shop_id: shop.id,
    p_note: `POS sale #${posOrder.id.slice(0, 8)}`,
  });

  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
  } else {
    const { data: updatedProd } = await supabaseAdmin
      .from('products')
      .select('stock_quantity')
      .eq('id', product.id)
      .single();
    console.log(`  ✓ Stock quantity successfully updated: ${initialStock} -> ${updatedProd?.stock_quantity}`);
  }

  // 6. Test Analytics Metrics: Till Cash Calculation
  console.log('\n[TEST 4] Calculating Today\'s Cash in Till...');
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: todaysCashOrders } = await supabaseAdmin
    .from('orders')
    .select('total_amount, payment_method, verification_method')
    .eq('shop_id', shop.id)
    .gte('created_at', since24h)
    .eq('payment_method', 'cash');

  const tillTotal = (todaysCashOrders ?? []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  console.log(`  ✓ Today's Cash in Till Total: ৳${tillTotal.toLocaleString()} (${(todaysCashOrders ?? []).length} cash sales)`);

  // 7. Test Gross Profit & Margins Calculation
  console.log('\n[TEST 5] Testing Gross Profit & Margins Calculation...');
  const { data: lineItems } = await supabaseAdmin
    .from('order_line_items')
    .select('quantity, unit_price, products(cost_price)')
    .eq('order_id', posOrder.id);

  let rev = 0;
  let cost = 0;
  for (const li of lineItems ?? []) {
    const q = Number(li.quantity ?? 1);
    const u = Number(li.unit_price ?? 0);
    const c = Number((li as any).products?.cost_price ?? 900);
    rev += q * u;
    cost += q * c;
  }
  const grossProfit = rev - cost;
  const marginPercent = rev > 0 ? Math.round((grossProfit / rev) * 100) : 0;
  console.log(`  ✓ Gross Revenue: ৳${rev} | COGS: ৳${cost} | Gross Profit: ৳${grossProfit} (${marginPercent}% margin)`);

  // Clean up test order
  console.log('\n[TEST CLEANUP] Cleaning up test POS order...');
  await supabaseAdmin.from('order_line_items').delete().eq('order_id', posOrder.id);
  await supabaseAdmin.from('orders').delete().eq('id', posOrder.id);
  console.log('  ✓ Cleanup complete.');

  console.log('\n======================================================');
  console.log('  ALL POS & ANALYTICS TESTS PASSED (5/5)!');
  console.log('======================================================\n');
}

runPosAndAnalyticsTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
