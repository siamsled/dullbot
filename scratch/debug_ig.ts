import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  // The issue: when entry.id = '1246008781920134' (FB page ID), the lookup returns undefined
  // because there are TWO rows with meta_page_id='1246008781920134' for different shops
  // Supabase maybeSingle() returns null when there are multiple rows matching!
  
  const fbPageId = '1246008781920134';
  
  console.log('--- All rows with meta_page_id =', fbPageId, '---');
  const { data: allRows } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('*')
    .eq('meta_page_id', fbPageId);
  console.log('Count:', allRows?.length);
  for (const r of allRows || []) {
    console.log(`  shop_id=${r.shop_id} ig_id=${r.instagram_business_id} is_primary=${r.is_primary}`);
  }

  // This is the bug: maybeSingle() silently returns null when there's multiple rows
  // The .or() query can also hit BOTH rows and return null from maybeSingle()
  const { data: test, error: testErr } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('shop_id, meta_page_access_token, instagram_business_id, instagram_access_token, meta_page_id')
    .or(`meta_page_id.eq.${fbPageId},instagram_business_id.eq.${fbPageId}`)
    .maybeSingle();
  console.log('\nOR query maybeSingle() result:', test);
  console.log('OR query maybeSingle() error:', testErr);

  // Now test: Instagram sends entry.id = the Facebook Page ID (1246008781920134) for IG DMs too
  // So the lookup fails because maybeSingle() gets null due to multiple rows
  
  // FIX: We need to order and pick the one with instagram_business_id first
  const { data: fixedRows } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('*')
    .or(`meta_page_id.eq.${fbPageId},instagram_business_id.eq.${fbPageId}`)
    .order('instagram_business_id', { ascending: false, nullsFirst: false });
  console.log('\nFix preview (ordered by IG ID desc):');
  for (const r of fixedRows || []) {
    console.log(`  page=${r.meta_page_name} shop=${r.shop_id} ig=${r.instagram_business_id} primary=${r.is_primary}`);
  }
}

main().catch(console.error);
