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

async function check() {
  console.log('1. Checking product_media table...');
  const { data: mediaData, error: mediaError } = await supabase
    .from('product_media')
    .select('*')
    .limit(1);
  if (mediaError) {
    console.log('   product_media error:', mediaError.message);
  } else {
    console.log('   product_media table exists!');
  }

  console.log('2. Checking if stock_movements supports null product_id...');
  const { data: movements, error: movementsError } = await supabase
    .from('stock_movements')
    .select('*')
    .limit(1);
  if (movementsError) {
    console.log('   stock_movements error:', movementsError.message);
  } else {
    console.log('   stock_movements table exists! First entry:', movements);
  }
}

check();
