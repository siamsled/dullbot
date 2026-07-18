const fs = require('fs');
const envFile = fs.readFileSync('/Users/shah/Documents/GitHub/dullbot/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['\"']|['\"']$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: products, error } = await supabase.from('products').select('id, name, image_url');
  if (error) {
    console.error('Error fetching products:', error.message);
    return;
  }
  console.log('--- products in DB ---');
  console.log(JSON.stringify(products, null, 2));
}

run().catch(console.error);
