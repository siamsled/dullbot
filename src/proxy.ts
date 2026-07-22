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
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

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
