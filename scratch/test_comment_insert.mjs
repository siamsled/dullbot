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

// Insert a test comment directly to check column names
const testInsert = await supabase.from('post_comments').insert({
  shop_id: '2e2d42b7-397f-4098-a943-a484b1bc5c85',
  post_id: '1246008781920134_122117368719382466',
  comment_id: 'TEST_DIRECT_' + Date.now(),
  sender_id: '123456789',
  sender_name: 'Test User',
  comment_text: 'Direct DB test comment',
  channel: 'messenger',
  created_at: new Date().toISOString(),
});

if (testInsert.error) {
  console.error('❌ Insert failed:', testInsert.error.message);
  console.error('   Code:', testInsert.error.code);
  console.error('   Details:', testInsert.error.details);
  
  // Try without 'channel' column
  console.log('\nRetrying without channel column...');
  const retry = await supabase.from('post_comments').insert({
    shop_id: '2e2d42b7-397f-4098-a943-a484b1bc5c85',
    post_id: '1246008781920134_122117368719382466',
    comment_id: 'TEST_DIRECT2_' + Date.now(),
    sender_id: '123456789',
    sender_name: 'Test User',
    comment_text: 'Direct DB test comment v2',
    created_at: new Date().toISOString(),
  });
  if (retry.error) {
    console.error('❌ Retry also failed:', retry.error.message);
  } else {
    console.log('✅ Insert succeeded WITHOUT channel column — column does not exist!');
    console.log('   Need to remove channel from webhook code');
  }
} else {
  console.log('✅ Insert succeeded with channel column');
}

// Show final state
const { data: comments } = await supabase
  .from('post_comments')
  .select('comment_id, sender_name, comment_text, post_id, created_at')
  .order('created_at', { ascending: false })
  .limit(5);
console.log('\nLatest comments in DB:');
comments?.forEach(c => console.log(`  [${c.created_at}] ${c.sender_name}: "${c.comment_text}" (post: ${c.post_id})`));
