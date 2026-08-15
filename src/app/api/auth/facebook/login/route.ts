import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');
  const source = searchParams.get('source');

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID || '2249651995857878';
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/facebook/callback`;

  // Valid Meta OAuth Scopes — includes user profile fields (name, picture, gender) for inbox display
  const scopes = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_engagement,instagram_basic,instagram_manage_messages,instagram_manage_comments,business_management,whatsapp_business_messaging,whatsapp_business_management,pages_user_gender,pages_user_locale';

  const stateObj = { shopId: shopId || 'dull-store', source: source || 'settings' };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  // auth_type=reauthenticate forces Facebook to show the full permissions dialog
  // even if the user previously authorized the app — ensures new scopes are granted
  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&auth_type=reauthenticate`;

  return NextResponse.redirect(fbAuthUrl);
}
