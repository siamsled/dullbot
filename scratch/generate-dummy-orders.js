const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseServiceKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const customerNames = [
  'Arif Rahman', 'Sadia Islam', 'Tanvir Ahmed', 'Nusrat Jahan',
  'Mehadi Hasan', 'Fahmida Akter', 'Rakibul Islam', 'Anika Tabassum',
  'Imran Khan', 'Sumaiya Yasmin', 'Sajib Hossain', 'Tasnim Begum'
];

const customerPhones = [
  '01712345678', '01812345678', '01912345678', '01512345678',
  '01612345678', '01312345678', '01412345678', '01799887766'
];

const customerAddresses = [
  { district: 'Dhaka', address: 'House 42, Road 12, Dhanmondi, Dhaka' },
  { district: 'Dhaka', address: 'Sector 4, Road 7, Uttara, Dhaka' },
  { district: 'Chittagong', address: '128 GEC Circle, O.R. Nizam Road, Chittagong' },
  { district: 'Sylhet', address: 'Zindabazar Point, Sylhet Sadar, Sylhet' },
  { district: 'Dhaka', address: 'Holding 14/B, Ring Road, Mohammadpur, Dhaka' },
  { district: 'Khulna', address: '24 Boyra Main Road, Khulna Sadar, Khulna' },
  { district: 'Rajshahi', address: 'Alupatti Intersection, Ghoramara, Rajshahi' },
  { district: 'Gazipur', address: 'Chowrasta, Gazipur Bypass Road, Gazipur' }
];

const courierProviders = ['Pathao', 'Steadfast', 'Paperfly', 'RedX'];
const orderStatuses = ['pending_verification', 'confirmed', 'rejected', 'fulfilled'];
const fulfillmentStatuses = ['awaiting_dispatch', 'dispatched', 'in_transit', 'delivered', 'cancelled'];

async function run() {
  console.log("Fetching all shops...");
  const { data: shops, error: shopError } = await supabase
    .from('shops')
    .select('id, name');

  if (shopError || !shops) {
    console.error("Failed to fetch shops:", shopError);
    return;
  }

  for (const shop of shops) {
    console.log(`\nProcessing shop: ${shop.name} (${shop.id})`);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('shop_id', shop.id);

    if (productsError || !products || products.length === 0) {
      console.log(`No products found for ${shop.name}. Skipping...`);
      continue;
    }

    console.log(`Found ${products.length} products to use for ${shop.name}.`);

    const ordersToInsert = [];
    const now = new Date();

  for (let i = 0; i < 15; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
    const phone = customerPhones[Math.floor(Math.random() * customerPhones.length)];
    const location = customerAddresses[Math.floor(Math.random() * customerAddresses.length)];
    
    // Choose status and matching fulfillment status
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    let fulfillmentStatus = 'awaiting_dispatch';
    
    if (status === 'fulfilled') {
      fulfillmentStatus = 'delivered';
    } else if (status === 'rejected') {
      fulfillmentStatus = 'cancelled';
    } else if (status === 'confirmed') {
      // 50% chance of being dispatched
      fulfillmentStatus = Math.random() > 0.5 ? 'dispatched' : 'awaiting_dispatch';
    }
    
    // Distribute order dates across the last 30 days
    const orderDate = new Date();
    orderDate.setDate(now.getDate() - Math.floor(Math.random() * 30));
    orderDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const deliveryCharge = 100;
    const itemPrice = product.price;
    const totalAmount = itemPrice + deliveryCharge;

    const isPaid = ['confirmed', 'fulfilled'].includes(status);
    const isDispatched = ['dispatched', 'delivered'].includes(fulfillmentStatus);

    ordersToInsert.push({
      shop_id: shop.id,
      customer_name: customer,
      customer_phone: phone,
      customer_address: location.address,
      customer_district: location.district,
      product_id: product.id,
      status: status,
      delivery_charge_amount: deliveryCharge,
      total_amount: totalAmount,
      fulfillment_status: fulfillmentStatus,
      payment_method: isPaid ? (Math.random() > 0.5 ? 'bkash' : 'cod') : 'cod',
      payment_verified_at: isPaid ? orderDate.toISOString() : null,
      payment_transaction_ref: isPaid && Math.random() > 0.5 ? 'TRX' + Math.random().toString(36).substring(2, 10).toUpperCase() : null,
      created_at: orderDate.toISOString(),
      courier_provider: isDispatched ? courierProviders[Math.floor(Math.random() * courierProviders.length)] : null,
      courier_tracking_id: isDispatched ? 'TRACK' + Math.floor(100000 + Math.random() * 900000) : null
    });
  }

  console.log(`Inserting ${ordersToInsert.length} dummy orders...`);
  
  for (const ord of ordersToInsert) {
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert(ord)
      .select('id, product_id, created_at')
      .single();

    if (insertError) {
      console.error("Error inserting order:", insertError);
      continue;
    }

    const product = products.find(p => p.id === ord.product_id);

    // 1. Add Line Item
    await supabase
      .from('order_line_items')
      .insert({
        order_id: insertedOrder.id,
        product_id: ord.product_id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price
      });

    // 2. Add Status History
    await supabase
      .from('order_status_history')
      .insert({
        order_id: insertedOrder.id,
        status: ord.status,
        note: `Order seeded with status '${ord.status}' and fulfillment '${ord.fulfillment_status}'.`,
        created_at: insertedOrder.created_at
      });
  }
  
  } // end of shops loop

  console.log("Successfully seeded dummy orders!");
}

run();
