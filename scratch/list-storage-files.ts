import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: files, error } = await supabase.storage.from('product-images').list('global', { limit: 10 });
  if (error) {
    console.error("List error:", error);
    return;
  }
  console.log("Files in global folder:", files);
  for (const f of files || []) {
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(`global/${f.name}`);
    console.log("File:", f.name, "Public URL:", publicUrl);
  }
}

run();
