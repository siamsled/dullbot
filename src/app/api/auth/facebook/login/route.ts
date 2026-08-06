import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');
  const source = searchParams.get('source');

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID || '2249651995857878';
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/facebook/callback`;

  // We now request all scopes so both Messenger and Instagram can be connected at once
  const scopes = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,instagram_basic,instagram_manage_messages';

  const stateObj = { shopId: shopId || 'dull-store', source: source || 'settings' };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  // auth_type=rerequest forces Meta to re-ask for any scopes the user may not have granted yet
  // (e.g. instagram_basic was added after the user first connected — this re-prompts them)
  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&auth_type=rerequest${configId ? `&config_id=${configId}` : ''}`;

  return NextResponse.redirect(fbAuthUrl);
}
