import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testFetchProfile() {
  const { data: pages } = await supabase.from('shop_meta_pages').select('*');
  const { data: convs } = await supabase.from('conversations').select('*');

  console.log('Available Pages:', pages.map(p => ({ id: p.meta_page_id, name: p.meta_page_name, ig_id: p.instagram_business_id })));

  for (const conv of convs) {
    console.log(`\n========================================`);
    console.log(`Conv: ${conv.id} | channel: ${conv.channel} | PSID: ${conv.customer_phone} | current meta_name: ${conv.meta_name}`);
    
    // Try with each page token
    for (const page of pages) {
      console.log(`--- Trying Page Token: ${page.meta_page_name} (${page.meta_page_id}) ---`);
      const token = page.meta_page_access_token;
      
      // Test Facebook PSID query
      const fbUrl = `https://graph.facebook.com/v19.0/${conv.customer_phone}?fields=first_name,last_name,name,profile_pic&access_token=${token}`;
      try {
        const res = await fetch(fbUrl);
        const data = await res.json();
        console.log('FB Graph result:', data);
      } catch (e) {
        console.log('FB Err:', e.message);
      }

      // If Instagram
      if (page.instagram_access_token || page.meta_page_access_token) {
        const igToken = page.instagram_access_token || page.meta_page_access_token;
        const igUrl = `https://graph.facebook.com/v19.0/${conv.customer_phone}?fields=name,username,profile_pic&access_token=${igToken}`;
        try {
          const res = await fetch(igUrl);
          const data = await res.json();
          console.log('IG Graph result:', data);
        } catch (e) {
          console.log('IG Err:', e.message);
        }
      }
    }
  }
}

testFetchProfile();
