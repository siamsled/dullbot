import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Starting cleanup pass 2...");
  
  // 1. Get dull-store
  const { data: dullStore } = await supabaseAdmin.from('shops').select('id').eq('slug', 'dull-store').single();
  
  if (dullStore) {
    // Delete all stock_movements not belonging to dull-store
    console.log("Deleting stock_movements for other shops...");
    const { error: smErr } = await supabaseAdmin.from('stock_movements').delete().neq('shop_id', dullStore.id);
    if (smErr) console.error("Failed to delete stock_movements:", smErr);
    
    // Delete all products not belonging to dull-store
    console.log("Deleting products for other shops...");
    const { error: pErr } = await supabaseAdmin.from('products').delete().neq('shop_id', dullStore.id);
    if (pErr) console.error("Failed to delete products:", pErr);
  }

  // 2. Get all remaining shops
  const { data: shops, error: shopsErr } = await supabaseAdmin.from('shops').select('id, slug, name');
  if (!shopsErr && shops) {
    const shopsToDelete = shops.filter(s => s.slug !== 'dull-store');
    console.log(`Found ${shopsToDelete.length} shops to delete.`);
    for (const shop of shopsToDelete) {
      const { error } = await supabaseAdmin.from('shops').delete().eq('id', shop.id);
      if (error) console.error(`Failed to delete shop ${shop.slug}:`, error);
      else console.log(`Deleted shop: ${shop.slug}`);
    }
  }

  // 3. Delete remaining users
  const { data: users, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
  if (!usersErr && users) {
    console.log(`Found ${users.users.length} users to delete.`);
    for (const user of users.users) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) console.error(`Failed to delete user ${user.email}:`, error);
      else console.log(`Deleted user: ${user.email}`);
    }
  }
  
  console.log("Cleanup pass 2 complete!");
}

main().catch(console.error);
