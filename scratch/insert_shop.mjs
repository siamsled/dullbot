import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('shops')
    .upsert({
      slug: 'dull-store',
      name: 'Dull Store'
    }, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error('Error inserting shop:', error);
  } else {
    console.log('Shop successfully inserted:', data);
  }
}

run();
