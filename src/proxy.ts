import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are protected (require authentication)
const PROTECTED_PREFIXES = ['/dashboard'];
// Routes that are public even if starting with /dashboard
const PUBLIC_DASHBOARD_PATHS: string[] = [];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Read Supabase session token from cookie
  // Supabase stores the session as sb-<ref>-auth-token
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : null;

  const hasSession = cookieName
    ? request.cookies.has(cookieName)
    : false;

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match /dashboard and all subpaths, skip static/_next files
    '/dashboard/:path*',
  ],
};
