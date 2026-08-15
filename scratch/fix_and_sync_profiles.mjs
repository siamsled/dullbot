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

async function syncAllProfiles() {
  const { data: pages } = await supabase.from('shop_meta_pages').select('*');
  const { data: convs } = await supabase.from('conversations').select('*');

  console.log(`Syncing profiles for ${convs?.length} conversations...`);

  for (const conv of convs || []) {
    const psid = conv.customer_phone;
    if (!psid || !/^\d+$/.test(psid)) continue;

    let foundProfile = null;

    // Collect all tokens from shop_meta_pages
    for (const page of pages || []) {
      const tokens = [page.meta_page_access_token, page.instagram_access_token].filter(Boolean);
      for (const token of tokens) {
        if (foundProfile) break;

        // Try Facebook fields
        try {
          const res = await fetch(`https://graph.facebook.com/v19.0/${psid}?fields=first_name,last_name,name,profile_pic&access_token=${token}`);
          if (res.ok) {
            const d = await res.json();
            const name = d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim();
            if (name || d.profile_pic) {
              foundProfile = {
                name: name || 'Customer',
                pic: d.profile_pic || null
              };
              break;
            }
          }
        } catch {}

        // Try Instagram fields
        try {
          const res = await fetch(`https://graph.facebook.com/v19.0/${psid}?fields=name,profile_pic&access_token=${token}`);
          if (res.ok) {
            const d = await res.json();
            if (d.name || d.profile_pic) {
              foundProfile = {
                name: d.name || 'Customer',
                pic: d.profile_pic || null
              };
              break;
            }
          }
        } catch {}
      }
      if (foundProfile) break;
    }

    if (foundProfile) {
      console.log(`✅ Found profile for ${psid}:`, foundProfile.name);
      await supabase
        .from('conversations')
        .update({
          meta_name: foundProfile.name,
          meta_profile_pic: foundProfile.pic,
          meta_checked_at: new Date().toISOString()
        })
        .eq('id', conv.id);
    } else {
      console.log(`⚠️ No profile found for ${psid}`);
    }
  }

  console.log('Finished profile sync.');
}

syncAllProfiles();
