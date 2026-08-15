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

// 1. Show what posts are in the DB
const { data: posts } = await supabase
  .from('post_automations')
  .select('id, shop_id, post_id, meta_post_id, caption, is_active')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('=== Registered Post Automations ===');
posts?.forEach(p => console.log(`  [${p.is_active ? 'ACTIVE' : 'INACTIVE'}] DB ID: ${p.id} | post_id: ${p.post_id} | meta_post_id: ${p.meta_post_id} | caption: ${p.caption}`));

// 2. Show recent comments
const { data: comments } = await supabase
  .from('post_comments')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('\n=== Recent post_comments in DB ===');
if (!comments?.length) {
  console.log('  ❌ EMPTY - No comments in the database at all!');
} else {
  comments.forEach(c => console.log(`  [${c.created_at}] ${c.sender_name}: "${c.comment_text}" (post: ${c.post_id}, comment_id: ${c.comment_id})`));
}

// 3. The issue: the webhook handler checks 'post_automations' with post_id matching the comment's post_id
// Let's trace what post_id the test comment would use
const testPostId = '1226805843855270_122127879820791880';
console.log('\n=== Checking if test post matches any automation ===');
const { data: matchPosts } = await supabase
  .from('post_automations')
  .select('*')
  .or(`post_id.eq.${testPostId},meta_post_id.eq.${testPostId}`);
console.log('Matched:', matchPosts?.length || 0, 'automation(s)');

// 4. Try the actual meta_post_id format of the bluberry post
console.log('\n=== Looking for bluberry post ===');
const { data: bluberry } = await supabase
  .from('post_automations')
  .select('*')
  .ilike('caption', '%bluberry%')
  .limit(1)
  .single();
console.log('Bluberry post:', JSON.stringify(bluberry, null, 2));
