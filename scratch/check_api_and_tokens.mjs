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

// Get page tokens
const { data: shop } = await supabase
  .from('shops')
  .select('id, meta_page_id, meta_page_access_token')
  .eq('id', '2e2d42b7-397f-4098-a943-a484b1bc5c85')
  .single();

const { data: pages } = await supabase
  .from('shop_meta_pages')
  .select('meta_page_id, meta_page_name, meta_page_access_token')
  .eq('shop_id', '2e2d42b7-397f-4098-a943-a484b1bc5c85');

const allPages = pages || [];

for (const page of allPages) {
  console.log(`\n=== Testing page: ${page.meta_page_name} (${page.meta_page_id}) ===`);
  
  // 1. Test published_posts
  const postsRes = await fetch(
    `https://graph.facebook.com/v19.0/${page.meta_page_id}/published_posts?fields=id,message,created_time&limit=5&access_token=${page.meta_page_access_token}`
  );
  const postsData = await postsRes.json();
  
  if (postsData.error) {
    console.log('❌ published_posts error:', postsData.error.message, '(code:', postsData.error.code, ')');
  } else {
    console.log(`✅ Found ${postsData.data?.length || 0} posts`);
    postsData.data?.slice(0, 3).forEach(p => {
      console.log(`  [${p.created_time}] ID: ${p.id} - "${(p.message || '(no text)').slice(0, 50)}"`);
    });
  }

  // 2. Test token info
  const tokenRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${page.meta_page_access_token}&access_token=${env.NEXT_PUBLIC_FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`
  );
  const tokenData = await tokenRes.json();
  if (tokenData.data) {
    console.log(`Token expires: ${tokenData.data.expires_at === 0 ? 'Never (long-lived)' : new Date(tokenData.data.expires_at * 1000).toISOString()}`);
    console.log(`Token scopes: ${tokenData.data.scopes?.join(', ')}`);
    console.log(`Token valid: ${tokenData.data.is_valid}`);
  }
}

// 3. Check the saved automation's post_id vs actual page posts
console.log('\n=== Saved automation post_id vs actual posts ===');
const { data: automation } = await supabase.from('post_automations').select('*').single();
console.log('Saved post_id:', automation?.post_id);
const savedPageId = automation?.post_id?.split('_')[0];
console.log('Saved page ID extracted:', savedPageId);
const matchingPage = allPages.find(p => p.meta_page_id === savedPageId);
console.log('Matching page found:', matchingPage?.meta_page_name || 'NO MATCH');
