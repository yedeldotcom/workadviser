import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './app/api/admin/auth/route';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip auth endpoint itself and login page
  if (path === '/api/admin/auth' || path === '/admin/login') {
    return NextResponse.next();
  }

  // Protect /api/admin/* routes
  if (path.startsWith('/api/admin')) {
    // Check bearer token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token === process.env.ADMIN_SECRET) {
        return NextResponse.next();
      }
    }

    // Also accept session cookie
    const sessionToken = request.cookies.get('admin_session')?.value;
    if (sessionToken && verifySessionToken(sessionToken)) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Protect /admin/* UI pages
  if (path.startsWith('/admin')) {
    const sessionToken = request.cookies.get('admin_session')?.value;
    if (sessionToken && verifySessionToken(sessionToken)) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
