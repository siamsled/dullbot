import * as fs from 'fs';
import * as path from 'path';

// Inject environment variables FIRST before importing any Supabase modules
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const val = match[2]?.replace(/^\"|\"$/g, '').trim() || '';
    process.env[match[1]] = val;
  }
});

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runSecurityTestSuite() {
  const { POST } = await import('../src/app/api/payments/sms-webhook/route');
  const { createCompanionDevice, revokeCompanionDevice } = await import('../src/lib/companion-registry');

  console.log('\n======================================================');
  console.log('🔒 STARTING DULLBOT COMPANION SECURITY TEST SUITE');
  console.log('======================================================\n');

  // 1. Create two isolated test shops
  const stamp = Date.now();
  const { data: shopA, error: errA } = await supabase.from('shops').insert({
    name: `Test Shop A ${stamp}`,
    slug: `test-shop-a-${stamp}`,
  }).select('*').single();

  const { data: shopB, error: errB } = await supabase.from('shops').insert({
    name: `Test Shop B ${stamp}`,
    slug: `test-shop-b-${stamp}`,
  }).select('*').single();

  if (errA || errB || !shopA || !shopB) {
    console.error('❌ Failed to setup test shops:', { errA, errB });
    process.exit(1);
  }
  console.log(`✅ Created test shops:\n   Shop A: ${shopA.id}\n   Shop B: ${shopB.id}`);

  // Create test products for both shops
  const { data: prodA } = await supabase.from('products').insert({ shop_id: shopA.id, name: 'Product A', price: 500, stock_quantity: 10 }).select().single();
  const { data: prodB } = await supabase.from('products').insert({ shop_id: shopB.id, name: 'Product B', price: 500, stock_quantity: 10 }).select().single();

  // 2. Create pending orders for BDT 500 in BOTH shops simultaneously
  const { data: orderA, error: oErrA } = await supabase.from('orders').insert({
    shop_id: shopA.id,
    product_id: prodA.id,
    customer_name: 'Customer A',
    customer_phone: '01711002233',
    customer_address: 'Dhaka, Bangladesh',
    total_amount: 500,
    status: 'pending_verification',
  }).select().single();

  const { data: orderB, error: oErrB } = await supabase.from('orders').insert({
    shop_id: shopB.id,
    product_id: prodB.id,
    customer_name: 'Customer B',
    customer_phone: '01899887766',
    customer_address: 'Chittagong, Bangladesh',
    total_amount: 500,
    status: 'pending_verification',
  }).select().single();

  if (oErrA || oErrB || !orderA || !orderB) {
    console.error('❌ Failed to create test orders:', { oErrA, oErrB });
    process.exit(1);
  }

  await supabase.from('payment_verifications').insert({
    order_id: orderA.id,
    method: 'notification_app',
    expected_amount: 500,
    status: 'pending',
  });

  await supabase.from('payment_verifications').insert({
    order_id: orderB.id,
    method: 'notification_app',
    expected_amount: 500,
    status: 'pending',
  });

  console.log(`✅ Created pending BDT 500 orders in BOTH shops:\n   Shop A Order: ${orderA.id}\n   Shop B Order: ${orderB.id}`);

  // 3. Register companion devices for both shops
  const devA = await createCompanionDevice(shopA.id, 'Device A');
  const devB = await createCompanionDevice(shopB.id, 'Device B');

  if (!devA.success || !devB.success || !devA.device || !devB.device) {
    console.error('❌ Failed to register test companion devices:', { devA, devB });
    process.exit(1);
  }

  console.log(`✅ Issued per-device cryptographic secrets:\n   Shop A Device Secret: ${devA.device.device_secret.slice(0, 16)}...\n   Shop B Device Secret: ${devB.device.device_secret.slice(0, 16)}...`);

  // Helper to call POST route
  async function callWebhook(secret: string | null, payload: any) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['Authorization'] = `Bearer ${secret}`;
    const req = new Request('http://localhost:3000/api/payments/sms-webhook', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const res = await POST(req as any);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  }

  // 4. TEST 1: Burned Static Secret Rejection Test
  console.log('\n--- TEST 1: Testing burned static secret dullbot_app_secret_123 rejection ---');
  const staticRes = await callWebhook(null, {
    secret: 'dullbot_app_secret_123',
    rawMessage: 'You have received BDT 500.00 from 01899887766. Ref: order. TrxID TEST_STATIC_BURNED',
  });
  console.log(`   Response HTTP Status: ${staticRes.status}, Body:`, staticRes.body);
  if (staticRes.status === 401) {
    console.log('   🎉 SUCCESS: Burned static secret dullbot_app_secret_123 correctly REJECTED with 401!');
  } else {
    console.error(`   ❌ FAILURE: Static secret returned HTTP ${staticRes.status}`);
    process.exit(1);
  }

  // 5. TEST 2: Multi-Tenant Cross-Shop Isolation Proof
  console.log('\n--- TEST 2: Testing Multi-Tenant Shop Isolation (Shop B phone posts BDT 500) ---');
  const trxIdB = `TRX_ISOLATION_${Date.now()}`;
  const webhookResB = await callWebhook(devB.device.device_secret, {
    rawMessage: `You have received BDT 500.00 from 01899887766. Ref: order. TrxID ${trxIdB}`,
  });

  console.log('   Shop B Webhook Response:', webhookResB);

  // Fetch current status of both orders
  const { data: updatedA } = await supabase.from('orders').select('status, bkash_transaction_id').eq('id', orderA.id).single();
  const { data: updatedB } = await supabase.from('orders').select('status, bkash_transaction_id').eq('id', orderB.id).single();

  console.log(`   Shop A Order Status: ${updatedA?.status} (Expected: pending_verification)`);
  console.log(`   Shop B Order Status: ${updatedB?.status} (Expected: confirmed, TrxID: ${updatedB?.bkash_transaction_id})`);

  if (updatedB?.status === 'confirmed' && updatedA?.status === 'pending_verification') {
    console.log('   🎉 SUCCESS: Shop B order confirmed! Shop A order remained STRICTLY PENDING! Zero cross-tenant data leakage!');
  } else {
    console.error('   ❌ FAILURE: Multi-tenant isolation check failed!', { updatedA, updatedB });
    process.exit(1);
  }

  // 6. TEST 3: Device Revocation Test
  console.log('\n--- TEST 3: Testing Device Revocation ---');
  await revokeCompanionDevice(devB.device.id, shopB.id);
  console.log(`   Revoked Device B (${devB.device.id})`);

  const revokedRes = await callWebhook(devB.device.device_secret, {
    rawMessage: `You have received BDT 500.00 from 01899887766. Ref: order. TrxID TRX_REVOKED_${Date.now()}`,
  });
  console.log(`   Response HTTP Status: ${revokedRes.status}, Body:`, revokedRes.body);
  if (revokedRes.status === 401) {
    console.log('   🎉 SUCCESS: Revoked companion device correctly REJECTED with 401!');
  } else {
    console.error(`   ❌ FAILURE: Revoked device returned HTTP ${revokedRes.status}`);
    process.exit(1);
  }

  // Clean up test shops & orders
  await supabase.from('shops').delete().in('id', [shopA.id, shopB.id]);
  console.log('\n======================================================');
  console.log('✅ ALL COMPANION SECURITY TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runSecurityTestSuite();
