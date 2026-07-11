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

async function run() {
  console.log("Fetching demo products...");
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, price, sku')
    .like('sku', 'LJ-%');
    
  if (fetchError) {
    console.error("Failed to fetch products:", fetchError);
    return;
  }
  
  if (!products || products.length === 0) {
    console.log("No demo products found.");
    return;
  }
  
  console.log(`Found ${products.length} demo products. Updating fields...`);
  
  for (const p of products) {
    // Generate realistic pricing
    const compareAt = p.price + Math.floor(Math.random() * 5000 + 2000);
    const cost = p.price - Math.floor(Math.random() * 4000 + 3000);
    const tags = ['leather', 'jacket', p.name.includes('Women') ? 'womens' : 'mens', 'premium', 'autumn'];
    
    // 1. Update the product
    await supabase.from('products').update({
      compare_at_price: compareAt,
      cost_price: cost,
      tags: tags
    }).eq('id', p.id);
    
    // 2. Clear old variants if any
    await supabase.from('product_variants').delete().eq('product_id', p.id);
    
    // 3. Add Sizes (S, M, L, XL)
    const sizes = ['S', 'M', 'L', 'XL'];
    const variants = sizes.map(size => ({
      product_id: p.id,
      name: `Size: ${size}`,
      sku: `${p.sku}-${size}`,
      price_override: null,
      stock: Math.floor(Math.random() * 15)
    }));
    
    await supabase.from('product_variants').insert(variants);
    
    console.log(`Filled data for ${p.sku} (Tags, Pricing, Variants)`);
  }
  
  console.log("All demo products have been fully populated!");
}

run();
