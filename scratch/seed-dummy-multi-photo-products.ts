import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const dummyCatalog = [
  {
    name: "Oversized Heavyweight Cotton Hoodie",
    description: "450 GSM luxury brushed fleece with dropped shoulders, double-layered hood, and ribbed cuffs. Pre-shrunk for an enduring boxy streetwear fit.",
    price: 1850,
    cost_price: 950,
    sku: "HD-OV-001",
    category: "Apparel / Hoodies",
    stock_quantity: 45,
    low_stock_threshold: 10,
    tags: ["hoodie", "fleece", "streetwear", "winter"],
    images: [
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Retro Minimalist Leather Sneakers",
    description: "Handcrafted low-top sneakers in crisp monochrome white. Premium Italian calfskin leather with vulcanized rubber soles and padded Ortholite footbed.",
    price: 3450,
    cost_price: 1800,
    sku: "SNK-RT-002",
    category: "Footwear / Sneakers",
    stock_quantity: 28,
    low_stock_threshold: 8,
    tags: ["sneakers", "leather", "casual", "white"],
    images: [
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Vintage Japanese Denim Chore Jacket",
    description: "14oz selvedge raw indigo denim crafted in Okayama. Triple-needle chainstitching with copper riveted utility pockets and custom brass donut buttons.",
    price: 4200,
    cost_price: 2200,
    sku: "JKT-DN-003",
    category: "Outerwear / Denim",
    stock_quantity: 18,
    low_stock_threshold: 5,
    tags: ["denim", "selvedge", "jacket", "indigo"],
    images: [
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Matte Black Chronograph Diver Watch",
    description: "316L stainless steel case with anti-reflective sapphire crystal glass. 200M water resistance, Japanese automatic movement, and luminescent Super-LumiNova dial.",
    price: 6800,
    cost_price: 3500,
    sku: "WTC-DV-004",
    category: "Accessories / Watches",
    stock_quantity: 12,
    low_stock_threshold: 4,
    tags: ["watch", "automatic", "diver", "waterproof"],
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Everyday Canvas Tote Bag with Leather Straps",
    description: "Heavy 18oz water-repellent duck canvas with full-grain bridle leather handles. Reinforced base, interior zip compartment, and brass snap closure.",
    price: 1250,
    cost_price: 550,
    sku: "BAG-TT-005",
    category: "Bags & Luggage",
    stock_quantity: 60,
    low_stock_threshold: 15,
    tags: ["tote", "canvas", "bag", "everyday"],
    images: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Polarized Acetate Sunglasses",
    description: "Handcrafted Italian Mazzucchelli acetate frames in tortoiseshell finish. Category 3 polarized UV400 lenses offering maximum glare reduction and optical clarity.",
    price: 2100,
    cost_price: 850,
    sku: "EYE-SG-006",
    category: "Eyewear",
    stock_quantity: 35,
    low_stock_threshold: 8,
    tags: ["sunglasses", "polarized", "eyewear", "summer"],
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Full-Grain Leather Bi-Fold Wallet",
    description: "Vegetable-tanned saddle leather that patinas gorgeously over time. 6 dedicated card slots, dual cash pockets, and RFID-blocking security lining.",
    price: 1650,
    cost_price: 700,
    sku: "WLT-BF-007",
    category: "Leather Goods",
    stock_quantity: 50,
    low_stock_threshold: 10,
    tags: ["wallet", "leather", "bifold", "accessories"],
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1606503829023-74a625e141a0?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Ribbed Wool Beanie Hat",
    description: "100% Merino wool 7-gauge knit beanie. Thermal-regulating, ultra-soft against the skin, and foldable cuff for a versatile slouch or fisherman fit.",
    price: 850,
    cost_price: 320,
    sku: "HAT-BN-008",
    category: "Headwear",
    stock_quantity: 75,
    low_stock_threshold: 20,
    tags: ["beanie", "wool", "winter", "merino"],
    images: [
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Premium Organic Pima Cotton T-Shirt",
    description: "220 GSM combed long-staple organic cotton. Silky smooth texture with twin-needle stitched hems and reinforced collar rib that holds its shape wash after wash.",
    price: 950,
    cost_price: 420,
    sku: "TEE-PM-009",
    category: "Apparel / Basics",
    stock_quantity: 80,
    low_stock_threshold: 20,
    tags: ["tshirt", "organic", "cotton", "basics"],
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?auto=format&fit=crop&q=80&w=1000",
    ]
  },
  {
    name: "Water-Resistant Commuter Backpack",
    description: "Matte PU-coated waterproof 900D Cordura nylon. Features dedicated padded 16\" laptop sleeve, ergonomic EVA back panel, and magnetic Fidlock closures.",
    price: 4500,
    cost_price: 2400,
    sku: "BAG-BP-010",
    category: "Bags & Luggage",
    stock_quantity: 22,
    low_stock_threshold: 5,
    tags: ["backpack", "commuter", "waterproof", "laptop"],
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1577733966973-d680bffd2e80?auto=format&fit=crop&q=80&w=1000",
    ]
  }
];

async function seed() {
  console.log("Seeding multi-picture dummy products...");

  // Find all shops or target Dullbot Testing shop
  const { data: shops, error: shopsErr } = await supabaseAdmin.from('shops').select('id, name, slug');
  if (shopsErr) throw shopsErr;

  const targetShops = shops.filter(s => 
    s.name?.toLowerCase().includes('dullbot') || 
    s.name?.toLowerCase().includes('testing') || 
    s.slug === 'store-165edd90' ||
    s.id === '2e2d42b7-397f-4098-a943-a484b1bc5c85'
  );

  console.log(`Found ${targetShops.length} target shop(s):`, targetShops.map(s => s.name));

  for (const shop of targetShops) {
    console.log(`\n--- Seeding products for: ${shop.name} (${shop.id}) ---`);

    for (const item of dummyCatalog) {
      // Check if product already exists by sku or name
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('sku', item.sku)
        .maybeSingle();

      let productId = existing?.id;

      if (!productId) {
        const { data: newProd, error: insertErr } = await supabaseAdmin
          .from('products')
          .insert({
            shop_id: shop.id,
            name: item.name,
            description: item.description,
            price: item.price,
            cost_price: item.cost_price,
            sku: item.sku,
            category: item.category,
            stock_quantity: item.stock_quantity,
            low_stock_threshold: item.low_stock_threshold,
            tags: item.tags,
            images: item.images,
            image_url: item.images[0],
            currency: 'BDT',
            is_active: true,
            draft: false,
            source: 'manual',
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error(`Error inserting ${item.name}:`, insertErr);
          continue;
        }
        productId = newProd.id;
        console.log(`✓ Created product: ${item.name} (${productId})`);
      } else {
        // Update images and stock
        await supabaseAdmin
          .from('products')
          .update({
            images: item.images,
            image_url: item.images[0],
            stock_quantity: item.stock_quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);
        console.log(`✓ Updated product: ${item.name} (${productId})`);
      }

      // Populate product_images table rows
      await supabaseAdmin.from('product_images').delete().eq('product_id', productId);
      const imgRows = item.images.map((url, idx) => ({
        product_id: productId,
        variant_id: null,
        url,
        position: idx,
      }));
      const { error: imgErr } = await supabaseAdmin.from('product_images').insert(imgRows);
      if (imgErr) console.error(`Error inserting images for ${item.name}:`, imgErr);
      else console.log(`  └ Inserted ${imgRows.length} product images`);
    }

    // Also update existing dummy products with photos if they have none
    const { data: currentProducts } = await supabaseAdmin
      .from('products')
      .select('id, name, images, image_url')
      .eq('shop_id', shop.id);

    for (const cp of currentProducts || []) {
      if ((!cp.images || cp.images.length === 0) && (!cp.image_url)) {
        if (cp.name.toLowerCase().includes('t-shirt')) {
          const sampleImages = [
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?auto=format&fit=crop&q=80&w=1000"
          ];
          await supabaseAdmin.from('products').update({ images: sampleImages, image_url: sampleImages[0], stock_quantity: 50 }).eq('id', cp.id);
          await supabaseAdmin.from('product_images').delete().eq('product_id', cp.id);
          await supabaseAdmin.from('product_images').insert(sampleImages.map((url, idx) => ({ product_id: cp.id, url, position: idx })));
          console.log(`✓ Backfilled images for existing ${cp.name}`);
        } else if (cp.name.toLowerCase().includes('sneakers')) {
          const sampleImages = [
            "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1000"
          ];
          await supabaseAdmin.from('products').update({ images: sampleImages, image_url: sampleImages[0], stock_quantity: 30 }).eq('id', cp.id);
          await supabaseAdmin.from('product_images').delete().eq('product_id', cp.id);
          await supabaseAdmin.from('product_images').insert(sampleImages.map((url, idx) => ({ product_id: cp.id, url, position: idx })));
          console.log(`✓ Backfilled images for existing ${cp.name}`);
        }
      }
    }
  }

  console.log("\nDummy product seeding complete!");
}

seed().catch(console.error);
