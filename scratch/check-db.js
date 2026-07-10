const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkShop() {
  const { data, error } = await supabase.from('shops').select('ai_instructions, language_mix, tone_formal_casual, emoji_frequency, auto_escalate_on_complaint').eq('slug', 'dull-store').single();
  console.log('Shop Data:', data);
  if (error) console.error(error);
  
  // also check if cache has entries
  const { data: cacheData } = await supabase.from('response_cache').select('response_text').eq('shop_id', data?.id);
  console.log('Cache entries:', cacheData?.length);
}

checkShop();
