const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let pageToken = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      // Wait, let's find the page token or use the service role to fetch a shop's token
      // We can fetch it directly from Supabase!
    }
  }
}

const { createClient } = require('@supabase/supabase-js');
let supabaseUrl = '';
let supabaseServiceKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = match[2].trim().replace(/^"|"$/g, '');
      if (match[1] === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = match[2].trim().replace(/^"|"$/g, '');
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFetch() {
  const { data: shops } = await supabase.from('shops').select('id, name, meta_page_access_token').limit(1);
  if (!shops || shops.length === 0) {
    console.log('No shops found.');
    return;
  }
  
  const shop = shops[0];
  const token = shop.meta_page_access_token;
  console.log(`Using token for shop ${shop.name} (token length: ${token ? token.length : 0})`);
  
  const psid = '36366829956293536';
  const url = `https://graph.facebook.com/v19.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${token}`;
  
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log('Meta API status:', res.status);
    console.log('Meta API response:', json);
  } catch (err) {
    console.error('Error fetching:', err);
  }
}

testFetch();
