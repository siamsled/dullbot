import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: rootItems, error } = await supabase.storage.from('product-images').list('');
  console.log("Root items:", rootItems);
  for (const item of rootItems || []) {
    if (!item.id) { // folder
      const { data: subItems } = await supabase.storage.from('product-images').list(item.name);
      console.log(`Folder ${item.name}:`, subItems);
      for (const sub of subItems || []) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(`${item.name}/${sub.name}`);
        console.log(`Public URL: ${publicUrl}`);
      }
    }
  }
}

run();
