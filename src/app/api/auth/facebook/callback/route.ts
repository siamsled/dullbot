import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawState = searchParams.get('state') || '';
  
  let shopId = rawState;
  let source = 'settings';
  
  try {
    const decoded = JSON.parse(Buffer.from(rawState, 'base64').toString('utf-8'));
    if (decoded.shopId) shopId = decoded.shopId;
    if (decoded.source) source = decoded.source;
  } catch (e) {
    // Fallback if state wasn't our JSON object (e.g., legacy connections)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?error=NoCode`);
  }

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/facebook/callback`;

  // 1. Exchange code for User Access Token
  const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error("Token exchange failed:", tokenData);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?error=TokenExchangeFailed`);
  }

  const shortLivedUserToken = tokenData.access_token;

  // 1.5 Exchange short-lived token for long-lived token
  const longLivedRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedUserToken}`);
  const longLivedData = await longLivedRes.json();
  
  if (!longLivedData.access_token) {
    console.error("Long-lived token exchange failed:", longLivedData);
  }
  
  const userAccessToken = longLivedData.access_token || shortLivedUserToken;

  // 1.8 Verify if instagram_basic permission was actually granted by Meta
  let hasIgPermission = true;
  try {
    const permRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${userAccessToken}`);
    const permData = await permRes.json();
    if (Array.isArray(permData?.data)) {
      const igPerm = permData.data.find((p: any) => p.permission === 'instagram_basic');
      hasIgPermission = igPerm?.status === 'granted';
      if (!hasIgPermission) {
        console.warn('Meta OAuth granted token WITHOUT instagram_basic permission. Granted permissions:', permData.data);
      }
    }
  } catch (e) {
    console.error('Failed to check token permissions:', e);
  }

  // 2. Fetch User's Pages (with instagram_business_account and business fields included directly)
  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account,business{id,name}&access_token=${userAccessToken}`);
  const pagesData = await pagesRes.json();

  if (!pagesData.data || pagesData.data.length === 0) {
    const errDest = (source === 'onboarding' || source === 'onboarding_instagram')
      ? '/onboarding?step=channels&error=NoPagesFound'
      : '/dashboard/settings?error=NoPagesFound';
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${errDest}`);
  }

  // Extract IG and WhatsApp IDs for a page item directly from the me/accounts response
  const getIgId = (p: any): string | null => p?.instagram_business_account?.id || null;
  const getWaId = (p: any): string | null => p?.connected_whatsapp_account?.id || null;

  // If user manages MULTIPLE pages, pass IG & WA info per page to client for selection
  if (pagesData.data.length > 1) {
    const pagesWithIg = pagesData.data.map((p: any) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token,
      user_access_token: userAccessToken,
      instagram_business_id: getIgId(p),
      whatsapp_business_account_id: getWaId(p),
    }));
    const encodedPages = encodeURIComponent(Buffer.from(JSON.stringify(pagesWithIg)).toString('base64'));
    const igMissingParam = !hasIgPermission ? '&ig_permission_missing=true' : '';
    const targetDest = (source === 'onboarding' || source === 'onboarding_instagram')
      ? `/onboarding?step=channels&select_page=true&pages=${encodedPages}${igMissingParam}`
      : `/dashboard/settings?select_page=true&pages=${encodedPages}${igMissingParam}`;
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${targetDest}`);
  }

  const page = pagesData.data[0];
  const pageAccessToken = page.access_token;
  const pageId = page.id;
  const pageName = page.name;

  const isUUID = shopId.includes('-') && shopId.length === 36;

  const instagramBusinessId = getIgId(page);
  const waBusinessId = getWaId(page);

  const payload = {
    meta_page_id: pageId,
    meta_page_name: pageName,
    meta_page_access_token: pageAccessToken,
    instagram_business_id: instagramBusinessId,
    instagram_access_token: instagramBusinessId ? pageAccessToken : null,
    ...(waBusinessId ? { whatsapp_business_account_id: waBusinessId, whatsapp_access_token: userAccessToken } : {}),
  };

  // Resolve shop UUID for shop_meta_pages (needed whether shopId is UUID or slug)
  let resolvedShopId: string | null = null;
  if (isUUID) {
    await supabaseAdmin.from('shops').update(payload).eq('id', shopId);
    resolvedShopId = shopId;
  } else {
    const { data: shopRow } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId || 'dull-store').single();
    resolvedShopId = shopRow?.id || null;
    if (resolvedShopId) await supabaseAdmin.from('shops').update(payload).eq('id', resolvedShopId);
  }

  // Also upsert into shop_meta_pages for multi-page routing support.
  // Guard: delete any stale row where this page_id belongs to a DIFFERENT shop
  // (prevents cross-shop duplicates that cause PGRST116 webhook routing failures).
  if (resolvedShopId) {
    await supabaseAdmin
      .from('shop_meta_pages')
      .delete()
      .eq('meta_page_id', pageId)
      .neq('shop_id', resolvedShopId);

    await supabaseAdmin.from('shop_meta_pages').upsert({
      shop_id: resolvedShopId,
      meta_page_id: pageId,
      meta_page_name: pageName,
      meta_page_access_token: pageAccessToken,
      instagram_business_id: instagramBusinessId,
      instagram_access_token: instagramBusinessId ? pageAccessToken : null,
      is_primary: true,
    }, { onConflict: 'shop_id,meta_page_id' });
  }

  // Subscribe page to Meta webhooks
  const { subscribePageToWebhooks } = await import('@/lib/meta-api');
  await subscribePageToWebhooks(pageId, pageAccessToken);

  // Determine redirection
  const igParam = instagramBusinessId ? '&instagram=connected' : '';
  const igMissingParam = !hasIgPermission ? '&ig_permission_missing=true' : '';
  const successDest = (source === 'onboarding' || source === 'onboarding_instagram')
    ? `/onboarding?step=channels&messenger=connected${igParam}${igMissingParam}`
    : `/dashboard/settings?success=1${igMissingParam}`;

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${successDest}`);
}


