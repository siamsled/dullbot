import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runSql(sql: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'params=single-object',
    },
  });
  // Use pg directly via service key and Supabase's SQL execution
  // Actually let's use supabase's .rpc or direct postgres connection
}

async function main() {
  // Run the migration statements using raw Supabase admin queries
  
  // Step 1: Delete stale duplicate row
  console.log('Step 1: Deleting stale duplicate row...');
  const { error: deleteErr, count } = await supabase
    .from('shop_meta_pages')
    .delete({ count: 'exact' })
    .eq('meta_page_id', '1246008781920134')
    .is('instagram_business_id', null)
    .eq('shop_id', '84ca459f-b9e3-455d-ab6f-fdb5395c5096');
  
  if (deleteErr) {
    console.error('Delete error:', deleteErr);
  } else {
    console.log('  Deleted rows:', count);
  }

  // Step 2: Verify current state of shop_meta_pages
  console.log('\nStep 2: Current shop_meta_pages:');
  const { data: pages } = await supabase
    .from('shop_meta_pages')
    .select('meta_page_id, meta_page_name, instagram_business_id, shop_id, is_primary');
  for (const p of pages || []) {
    console.log(' ', JSON.stringify(p));
  }

  // Check for remaining duplicates
  const pageCounts: Record<string, number> = {};
  for (const p of pages || []) {
    pageCounts[p.meta_page_id] = (pageCounts[p.meta_page_id] || 0) + 1;
  }
  const dupes = Object.entries(pageCounts).filter(([, c]) => c > 1);
  console.log('  Remaining duplicates:', dupes.length === 0 ? 'NONE ✓' : dupes);

  // Step 3: Check if dead_letter table exists
  console.log('\nStep 3: Checking webhook_dead_letters table...');
  const { error: dlErr } = await supabase
    .from('webhook_dead_letters')
    .select('id')
    .limit(1);
  
  if (dlErr && dlErr.code === 'PGRST116' || dlErr?.message?.includes('does not exist')) {
    console.log('  Table does not exist — need to run DDL via Supabase dashboard');
    console.log('  DDL to run:\n', `
CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  object TEXT,
  page_id TEXT,
  channel TEXT,
  raw_payload JSONB,
  error_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_wdl_received_at ON webhook_dead_letters (received_at DESC);
ALTER TABLE webhook_dead_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON webhook_dead_letters FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
  } else if (dlErr) {
    console.log('  Error checking table:', dlErr.message);
  } else {
    console.log('  Table exists ✓');
  }

  // Step 4: Verify IG lookup works
  console.log('\nStep 4: Verifying IG lookup...');
  const { data: igRow } = await supabase
    .from('shop_meta_pages')
    .select('meta_page_id, instagram_business_id, shop_id')
    .eq('instagram_business_id', '17841437399145417')
    .maybeSingle();
  console.log('  maybeSingle() for IG ID:', igRow ? 'FOUND ✓' : 'NOT FOUND ✗', igRow?.meta_page_name);

  // Step 5: Verify FB page lookup is no longer ambiguous
  console.log('\nStep 5: Verifying FB page lookup is unambiguous...');
  const { data: fbRow, error: fbErr } = await supabase
    .from('shop_meta_pages')
    .select('meta_page_id, instagram_business_id, shop_id')
    .eq('meta_page_id', '1246008781920134')
    .maybeSingle();
  console.log('  maybeSingle() for FB page ID:', fbErr ? `ERROR: ${fbErr.message}` : (fbRow ? 'FOUND ✓ (unambiguous)' : 'NOT FOUND'));
}

main().catch(console.error);
