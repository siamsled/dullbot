import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: shops } = await supabase
    .from('shops')
    .select('name, owner_id')
    .ilike('name', '%Jacket%');
    
  if (shops && shops.length > 0) {
    console.log("Shops found:", shops);
    for (const shop of shops) {
      const { data: users, error } = await supabase.auth.admin.getUserById(shop.owner_id);
      if (users && users.user) {
        console.log("Owner Email:", users.user.email);
      }
    }
  } else {
    console.log("No shops found.");
  }
}

run();
