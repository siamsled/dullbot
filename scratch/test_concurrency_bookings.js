const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseServiceKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConcurrency() {
  console.log('Starting Booking Concurrency Test...');

  // 1. Get first active shop
  const { data: shops } = await supabase.from('shops').select('id, name').limit(1);
  if (!shops || shops.length === 0) {
    console.error('No shops found in database.');
    return;
  }
  const shop = shops[0];
  console.log(`Using shop: ${shop.name} (${shop.id})`);

  // 2. Setup a dummy service if not exists, or get first one
  let serviceId = '';
  const { data: services } = await supabase.from('services').select('id').eq('shop_id', shop.id).limit(1);
  if (services && services.length > 0) {
    serviceId = services[0].id;
  } else {
    // Create service
    const { data: newService, error: sErr } = await supabase.from('services').insert({
      shop_id: shop.id,
      name: 'Test Haircut',
      price: 500,
      duration_minutes: 30,
      buffer_minutes: 0,
      requires_resource_type: 'staff'
    }).select().single();
    if (sErr) {
      console.error('Failed to create test service (likely schema not run yet):', sErr.message);
      return;
    }
    serviceId = newService.id;
  }

  // 3. Create a test resource
  console.log('Creating test staff resource...');
  const { data: resource, error: rErr } = await supabase.from('resources').insert({
    shop_id: shop.id,
    name: 'Test Concurrency Barber',
    resource_type: 'staff',
    capacity: 1,
    active: true
  }).select().single();

  if (rErr) {
    console.error('Failed to create test resource. Have you executed the SQL migration in Supabase?', rErr.message);
    return;
  }
  console.log(`Created test resource ID: ${resource.id}`);

  // 4. Set weekly availability rule for today (0-6)
  const todayNum = new Date().getDay();
  const { error: ruleErr } = await supabase.from('availability_rules').insert({
    resource_id: resource.id,
    day_of_week: todayNum,
    start_time: '08:00:00',
    end_time: '20:00:00'
  });

  if (ruleErr) {
    console.error('Failed to set availability rule:', ruleErr.message);
    // Cleanup
    await supabase.from('resources').delete().eq('id', resource.id);
    return;
  }
  console.log('Weekly availability set from 08:00 to 20:00.');

  // 5. Fire two simultaneous booking requests for the exact same slot
  const slotDate = new Date();
  slotDate.setDate(slotDate.getDate() + 1); // tomorrow
  const slotStr = slotDate.toISOString().split('T')[0];
  const startsAt = `${slotStr}T11:00:00+06:00`;
  const endsAt = `${slotStr}T11:30:00+06:00`; // 30 min duration + 0 buffer

  console.log(`Firing 2 simultaneous bookings for ${startsAt}...`);

  // Direct DB inserts to mimic concurrency
  const promise1 = supabase.from('bookings').insert({
    shop_id: shop.id,
    resource_id: resource.id,
    service_id: serviceId,
    customer_phone: '01711111111',
    customer_name: 'Client A',
    starts_at: startsAt,
    ends_at: endsAt,
    status: 'confirmed'
  });

  const promise2 = supabase.from('bookings').insert({
    shop_id: shop.id,
    resource_id: resource.id,
    service_id: serviceId,
    customer_phone: '01722222222',
    customer_name: 'Client B',
    starts_at: startsAt,
    ends_at: endsAt,
    status: 'confirmed'
  });

  const [res1, res2] = await Promise.all([promise1, promise2]);

  console.log('\nResults:');
  console.log(`Request A status: ${res1.error ? 'FAILED (' + res1.error.message + ')' : 'SUCCESS'}`);
  console.log(`Request B status: ${res2.error ? 'FAILED (' + res2.error.message + ')' : 'SUCCESS'}`);

  // 6. Verify GIST safety net
  const successCount = (res1.error ? 0 : 1) + (res2.error ? 0 : 1);
  if (successCount === 1) {
    console.log('\nCONCURRENCY CHECK PASSED: Exactly 1 booking succeeded. Overlapping bookings were physically blocked at the database level!');
  } else {
    console.error(`\nCONCURRENCY CHECK FAILED: Success count is ${successCount}. Double-booking occurred or both failed.`);
  }

  // 7. Cleanup test data
  console.log('\nCleaning up test resource...');
  await supabase.from('resources').delete().eq('id', resource.id);
  console.log('Cleanup completed successfully.');
}

testConcurrency();
