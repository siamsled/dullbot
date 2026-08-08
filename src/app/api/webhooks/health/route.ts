import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const appToken = appId && appSecret ? `${appId}|${appSecret}` : null;

    // 1. Check App-level subscriptions
    let appSubscriptions: any[] = [];
    if (appToken && appId) {
      try {
        const appSubRes = await fetch(
          `https://graph.facebook.com/v19.0/${appId}/subscriptions?access_token=${appToken}`,
          { cache: 'no-store' }
        );
        const appSubData = await appSubRes.json();
        appSubscriptions = appSubData?.data || [];
      } catch (e) {
        console.error('[Health Check] Error fetching app subscriptions:', e);
      }
    }

    const hasPageSub = appSubscriptions.some((s) => s.object === 'page');
    const hasIgSub = appSubscriptions.some((s) => s.object === 'instagram');

    // 2. Check shop_meta_pages status
    const { data: pages, error: pagesErr } = await supabaseAdmin
      .from('shop_meta_pages')
      .select('shop_id, meta_page_id, meta_page_name, instagram_business_id, is_primary, meta_page_access_token');

    if (pagesErr) {
      return NextResponse.json(
        { status: 'error', error: `Database error: ${pagesErr.message}` },
        { status: 500 }
      );
    }

    const pageStatuses = await Promise.all(
      (pages || []).map(async (p) => {
        let isSubscribed = false;
        let subscribedFields: string[] = [];
        let error: string | null = null;

        if (p.meta_page_access_token) {
          try {
            const subRes = await fetch(
              `https://graph.facebook.com/v19.0/${p.meta_page_id}/subscribed_apps?access_token=${p.meta_page_access_token}`,
              { cache: 'no-store' }
            );
            const subData = await subRes.json();
            if (subData?.data && Array.isArray(subData.data)) {
              const myAppSub = subData.data.find((a: any) => a.id === appId);
              if (myAppSub) {
                isSubscribed = true;
                subscribedFields = myAppSub.subscribed_fields || [];
              }
            } else if (subData?.error) {
              error = subData.error.message;
            }
          } catch (e: any) {
            error = e.message;
          }
        } else {
          error = 'Missing Page Access Token';
        }

        return {
          meta_page_id: p.meta_page_id,
          meta_page_name: p.meta_page_name,
          shop_id: p.shop_id,
          instagram_business_id: p.instagram_business_id,
          is_subscribed: isSubscribed,
          subscribed_fields: subscribedFields,
          error,
        };
      })
    );

    const allPagesHealthy = pageStatuses.every((p) => p.is_subscribed && !p.error);
    const overallHealthy = allPagesHealthy && hasPageSub && hasIgSub;

    return NextResponse.json(
      {
        status: overallHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        app_subscriptions: {
          page_object: hasPageSub,
          instagram_object: hasIgSub,
          raw: appSubscriptions,
        },
        pages: pageStatuses,
      },
      { status: overallHealthy ? 200 : 207 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { status: 'error', error: e.message || 'Internal health check error' },
      { status: 500 }
    );
  }
}
