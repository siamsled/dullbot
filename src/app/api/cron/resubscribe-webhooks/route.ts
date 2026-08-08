import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { subscribePageToWebhooks } from '@/lib/meta-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify secret header or authorization if CRON_SECRET is set
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: pages, error } = await supabaseAdmin
      .from('shop_meta_pages')
      .select('meta_page_id, meta_page_name, meta_page_access_token');

    if (error) {
      console.error('[Cron Resubscribe] Database query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const results = [];
    for (const page of pages || []) {
      if (page.meta_page_id && page.meta_page_access_token) {
        const subResult = await subscribePageToWebhooks(page.meta_page_id, page.meta_page_access_token);
        results.push({
          page_id: page.meta_page_id,
          name: page.meta_page_name,
          success: subResult.success,
        });
      }
    }

    console.log('[Cron Resubscribe] Executed daily webhook resubscribe:', results);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results });
  } catch (e: any) {
    console.error('[Cron Resubscribe] Execution error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
