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

  // 2. Fetch User's Pages
  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
  const pagesData = await pagesRes.json();

  if (!pagesData.data || pagesData.data.length === 0) {
    const errDest = (source === 'onboarding' || source === 'onboarding_instagram')
      ? '/onboarding?step=channels&error=NoPagesFound'
      : '/dashboard/settings?error=NoPagesFound';
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${errDest}`);
  }

  // If user manages MULTIPLE pages, pass the pages list to the client so the merchant selects the exact page
  if (pagesData.data.length > 1) {
    const pagesPayload = pagesData.data.map((p: any) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token,
    }));
    const encodedPages = encodeURIComponent(Buffer.from(JSON.stringify(pagesPayload)).toString('base64'));
    const targetDest = (source === 'onboarding' || source === 'onboarding_instagram')
      ? `/onboarding?step=channels&select_page=true&pages=${encodedPages}`
      : `/dashboard/settings?select_page=true&pages=${encodedPages}`;
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${targetDest}`);
  }

  const page = pagesData.data[0];
  const pageAccessToken = page.access_token;
  const pageId = page.id;
  const pageName = page.name;

  const isUUID = shopId.includes('-') && shopId.length === 36;

  // Fetch Instagram Business Account linked to this specific selected Page
  let instagramBusinessId: string | null = null;
  try {
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );
    const igData = await igRes.json();
    instagramBusinessId = igData?.instagram_business_account?.id || null;
  } catch (e) {
    console.error('Failed to fetch Instagram Business Account:', e);
  }

  const payload = {
    meta_page_id: pageId,
    meta_page_name: pageName,
    meta_page_access_token: pageAccessToken,
    instagram_business_id: instagramBusinessId,
    instagram_access_token: instagramBusinessId ? pageAccessToken : null,
    // Legacy columns for backwards compatibility
    meta_instagram_user_id: instagramBusinessId,
    meta_instagram_access_token: instagramBusinessId ? pageAccessToken : null,
  };

  if (isUUID) {
    await supabaseAdmin.from('shops').update(payload).eq('id', shopId);
  } else {
    await supabaseAdmin.from('shops').update(payload).eq('slug', shopId || 'dull-store');
  }

  // Determine redirection
  const igParam = instagramBusinessId ? '&instagram=connected' : '';
  const successDest = (source === 'onboarding' || source === 'onboarding_instagram')
    ? `/onboarding?step=channels&messenger=connected${igParam}`
    : '/dashboard/settings?success=1';

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${successDest}`);
}
