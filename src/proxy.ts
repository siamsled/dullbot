import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are protected (require authentication)
const PROTECTED_PREFIXES = ['/dashboard'];
// Routes that are public even if starting with /dashboard
const PUBLIC_DASHBOARD_PATHS: string[] = [];

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match /dashboard and all subpaths, skip static/_next files
    '/dashboard/:path*',
  ],
};
