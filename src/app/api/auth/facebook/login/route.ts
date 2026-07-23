import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');
  const source = searchParams.get('source');

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID || '2249651995857878';
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/facebook/callback`;
  const scopes = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement';
  
  const stateObj = { shopId: shopId || 'dull-store', source: source || 'settings' };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}${configId ? `&config_id=${configId}` : ''}`;

  return NextResponse.redirect(fbAuthUrl);
}
