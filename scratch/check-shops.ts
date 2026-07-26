import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: shops, error: shopsErr } = await supabaseAdmin.from('shops').select('id, slug, name, owner_id');
  if (shopsErr) console.error("Shops error:", shopsErr);
  else console.log("Shops:", shops);

  const { data: users, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
  if (usersErr) console.error("Users error:", usersErr);
  else console.log("Users:", users.users.map(u => ({ id: u.id, email: u.email })));
}

main().catch(console.error);
