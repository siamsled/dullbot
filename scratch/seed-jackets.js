const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const demoProducts = [
  {
    name: "Classic Biker Leather Jacket",
    description: "A timeless black leather biker jacket with asymmetrical zip closure, belted waist, and classic lapels. Made from 100% genuine full-grain leather.",
    price: 18500,
    sku: "LJ-BK-001",
    category: "Outerwear",
    stock_quantity: 15,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1520975954732-57dd22299614?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1520975954732-57dd22299614?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Vintage Brown Bomber Jacket",
    description: "Retro-inspired bomber jacket crafted from distressed brown leather. Features a ribbed collar, cuffs, and hem for a snug fit. Perfect for casual outings.",
    price: 16200,
    sku: "LJ-BR-002",
    category: "Outerwear",
    stock_quantity: 8,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Slim Fit Moto Racer Jacket",
    description: "Sleek and minimalist moto racer jacket in deep navy blue. Features a simple snap collar and smooth zippers. Tailored for a modern, slim fit.",
    price: 19000,
    sku: "LJ-NV-003",
    category: "Outerwear",
    stock_quantity: 5,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1521223830114-4a259c77c6c4?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1521223830114-4a259c77c6c4?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Women's Cropped Leather Jacket",
    description: "Chic cropped leather jacket in burgundy. Features silver-tone hardware and a flattering silhouette that pairs perfectly with high-waisted jeans or dresses.",
    price: 14500,
    sku: "LJ-WR-004",
    category: "Womenswear",
    stock_quantity: 12,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1559551409-dadc959f76b8?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1559551409-dadc959f76b8?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Aviator Shearling Leather Jacket",
    description: "Heavy-duty aviator jacket with a warm faux-shearling lining and oversized collar. Designed to withstand freezing temperatures while keeping you stylish.",
    price: 24000,
    sku: "LJ-AV-005",
    category: "Winter Wear",
    stock_quantity: 3,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1489987707023-afc8ea47da87?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1489987707023-afc8ea47da87?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Suede Leather Trucker Jacket",
    description: "A soft, premium suede iteration of the classic trucker jacket. Features button closures and dual chest pockets. Tan color offers great versatility.",
    price: 17500,
    sku: "LJ-SD-006",
    category: "Outerwear",
    stock_quantity: 0,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Double Breasted Leather Trench",
    description: "Elegant longline leather trench coat with a double-breasted front, epaulettes, and a tie belt. Perfect for formal or dramatic evening looks.",
    price: 28000,
    sku: "LJ-TR-007",
    category: "Premium",
    stock_quantity: 4,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Distressed Cafe Racer Jacket",
    description: "Rugged and road-ready cafe racer jacket with a heavy distressed finish. Features reinforced elbows and shoulders for authentic motorcycle styling.",
    price: 21000,
    sku: "LJ-CR-008",
    category: "Outerwear",
    stock_quantity: 7,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1512316635851-968564b73bd5?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1512316635851-968564b73bd5?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Quilted Puffer Leather Jacket",
    description: "A unique hybrid combining the warmth of a puffer jacket with the edge of real leather. Filled with insulated down for maximum winter comfort.",
    price: 26500,
    sku: "LJ-QP-009",
    category: "Winter Wear",
    stock_quantity: 9,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1578689947883-7c3ff5c120a1?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1578689947883-7c3ff5c120a1?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Minimalist Collarless Leather Jacket",
    description: "Ultra-clean collarless design with hidden zipper closure. This avant-garde piece focuses purely on silhouette and the high-grade matte leather texture.",
    price: 19500,
    sku: "LJ-MC-010",
    category: "Outerwear",
    stock_quantity: 2,
    is_active: true,
    draft: false,
    images: ["https://images.unsplash.com/photo-1550246140-5119ae4790b8?auto=format&fit=crop&q=80&w=800"],
    image_url: "https://images.unsplash.com/photo-1550246140-5119ae4790b8?auto=format&fit=crop&q=80&w=800"
  }
];

async function run() {
  const { data: shops, error: shopError } = await supabase.from('shops').select('id, name').limit(1);
  if (shopError || !shops || shops.length === 0) {
    console.error("Could not find a shop to insert into.");
    return;
  }
  
  const shopId = shops[0].id;
  console.log(`Found shop: ${shops[0].name} (${shopId})`);
  
  const productsToInsert = demoProducts.map(p => ({
    ...p,
    shop_id: shopId,
    currency: 'BDT',
    source: 'manual'
  }));
  
  const { data, error } = await supabase.from('products').insert(productsToInsert).select();
  
  if (error) {
    console.error("Error inserting products:", error);
  } else {
    console.log(`Successfully inserted ${data.length} demo leather jackets into your inventory!`);
  }
}

run();
