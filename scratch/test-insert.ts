import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const dummyUserId = '11111111-1111-1111-1111-111111111111'; // Just a dummy valid UUID format
  const { data, error } = await supabaseAdmin
    .from('shops')
    .insert({
      owner_id: dummyUserId,
      name: 'Test Store',
      slug: 'store-11111111',
    })
    .select('*')
    .single();

  console.log("Error:", error);
  console.log("Data:", data);
  
  if (data) {
    await supabaseAdmin.from('shops').delete().eq('id', data.id);
  }
}

testInsert().catch(console.error);
