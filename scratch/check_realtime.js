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
  const { data, error } = await supabase.rpc('get_realtime_publications');
  if (error) {
    // If RPC doesn't exist, query pub tables directly via SQL or just check
    console.log('Error listing publications:', error.message);
  }
  
  // Let's do a direct select on pg_publication_tables
  const { data: pubs, error: pubErr } = await supabase.from('_publication_tables').select('*').catch(() => ({ data: null }));
  console.log('Pub tables data:', pubs, pubErr);
}

run().catch(console.error);
