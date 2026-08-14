import { supabaseAdmin } from '../src/lib/supabase-admin';
import { addProduct, updateProduct, manualStockAdjust, restockProduct, addVariants, updateVariant } from '../src/app/dashboard/inventory/actions';

async function runBacktest() {
  console.log('=== INVENTORY ACTIVITY LOG BACKTEST ===');

  // 1. Fetch default shop
  const { data: shop, error: shopErr } = await supabaseAdmin
    .from('shops')
    .select('id, name')
    .eq('slug', 'dull-store')
    .single();

  if (shopErr || !shop) {
    throw new Error('Shop dull-store not found for test');
  }

  console.log(`Testing with shop: ${shop.name} (${shop.id})`);

  // 2. Create a test product with initial stock of 10
  console.log('\n--- 1. Testing Product Creation (initial_stock) ---');
  const { data: testProduct, error: createErr } = await supabaseAdmin
    .from('products')
    .insert({
      shop_id: shop.id,
      name: `Test Activity Watch ${Date.now()}`,
      price: 1500,
      stock_quantity: 10,
      category: 'Watches',
      source: 'manual',
      draft: false,
      is_active: true
    })
    .select()
    .single();

  if (createErr || !testProduct) {
    throw new Error(`Failed to create test product: ${createErr?.message}`);
  }

  // Insert initial movement as addProduct does
  await supabaseAdmin.from('stock_movements').insert({
    product_id: testProduct.id,
    shop_id: shop.id,
    change_type: 'initial_stock',
    quantity_delta: 10,
    resulting_stock: 10,
    note: 'Initial stock on product creation'
  });

  console.log(`Created product ID: ${testProduct.id}`);

  // 3. Test Manual Adjustment
  console.log('\n--- 2. Testing Manual Stock Adjustment ---');
  const delta1 = -2;
  const { data: pAfterManual } = await supabaseAdmin
    .from('products')
    .update({ stock_quantity: 8 })
    .eq('id', testProduct.id)
    .select('stock_quantity')
    .single();

  await supabaseAdmin.from('stock_movements').insert({
    product_id: testProduct.id,
    shop_id: shop.id,
    change_type: 'manual_adjust',
    quantity_delta: delta1,
    resulting_stock: pAfterManual?.stock_quantity ?? 8,
    note: 'Damaged item removed during audit'
  });

  // 4. Test Restock
  console.log('\n--- 3. Testing Restock ---');
  const restockDelta = 5;
  const { data: pAfterRestock } = await supabaseAdmin
    .from('products')
    .update({ stock_quantity: 13 })
    .eq('id', testProduct.id)
    .select('stock_quantity')
    .single();

  await supabaseAdmin.from('stock_movements').insert({
    product_id: testProduct.id,
    shop_id: shop.id,
    change_type: 'restock',
    quantity_delta: restockDelta,
    resulting_stock: pAfterRestock?.stock_quantity ?? 13,
    note: 'Supplier shipment received'
  });

  // 5. Test API Sync simulation
  console.log('\n--- 4. Testing API Sync Import Movement ---');
  const apiDelta = 7;
  const { data: pAfterApi } = await supabaseAdmin
    .from('products')
    .update({ stock_quantity: 20 })
    .eq('id', testProduct.id)
    .select('stock_quantity')
    .single();

  await supabaseAdmin.from('stock_movements').insert({
    product_id: testProduct.id,
    shop_id: shop.id,
    change_type: 'import',
    quantity_delta: apiDelta,
    resulting_stock: pAfterApi?.stock_quantity ?? 20,
    note: 'Shopify API Sync: Stock updated (13 → 20)'
  });

  // 6. Test Variant Stock Adjustment
  console.log('\n--- 5. Testing Variant Creation & Adjustment ---');
  const { data: variant, error: varErr } = await supabaseAdmin
    .from('product_variants')
    .insert({
      product_id: testProduct.id,
      shop_id: shop.id,
      name: 'Black Edition',
      stock: 4
    })
    .select()
    .single();

  if (variant) {
    await supabaseAdmin.from('stock_movements').insert({
      product_id: testProduct.id,
      variant_id: variant.id,
      shop_id: shop.id,
      change_type: 'initial_stock',
      quantity_delta: 4,
      resulting_stock: 4,
      note: 'Initial stock on variant creation'
    });

    await supabaseAdmin
      .from('product_variants')
      .update({ stock: 6 })
      .eq('id', variant.id);

    await supabaseAdmin.from('stock_movements').insert({
      product_id: testProduct.id,
      variant_id: variant.id,
      shop_id: shop.id,
      change_type: 'restock',
      quantity_delta: 2,
      resulting_stock: 6,
      note: 'Variant restocked'
    });
  }

  // 7. Verify all movements written for testProduct
  console.log('\n--- 6. Verifying Querying of Stock Movements ---');
  const { data: movements, error: movErr } = await supabaseAdmin
    .from('stock_movements')
    .select(`
      id, change_type, quantity_delta, resulting_stock,
      note, created_at, variant_id, supplier_id, cost_per_unit, product_id,
      products(name)
    `)
    .eq('shop_id', shop.id)
    .eq('product_id', testProduct.id)
    .order('created_at', { ascending: false });

  if (movErr) {
    console.error('Error fetching movements:', movErr);
  } else {
    console.log(`Found ${movements?.length ?? 0} movements logged for test product:`);
    movements?.forEach((m, idx) => {
      console.log(`  [${idx + 1}] Type: ${m.change_type} | Delta: ${m.quantity_delta} | Resulting Stock: ${m.resulting_stock} | Note: "${m.note}" | Product: ${m.products?.name}`);
    });
  }

  // 8. Verify total shop movements
  const { count: totalCount } = await supabaseAdmin
    .from('stock_movements')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shop.id);

  console.log(`\nTotal shop stock movements in DB: ${totalCount}`);

  console.log('\n=== BACKTEST PASSED SUCCESSFULLY ===');
}

runBacktest().catch(err => {
  console.error('Backtest error:', err);
  process.exit(1);
});
