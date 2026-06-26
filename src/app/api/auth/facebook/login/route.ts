import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/facebook/callback`;
  const scopes = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement';
  
  // Hardcoded to dull-store for prototyping. In production, this would be the actual user's shop slug.
  const state = 'dull-store';

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;

  return NextResponse.redirect(fbAuthUrl);
}
