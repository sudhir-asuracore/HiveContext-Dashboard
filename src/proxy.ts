import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/console') || (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && pathname !== '/api/login' && pathname !== '/api/logout')) {
    const customSession = await verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value ?? '');
    let isAuthenticated = !!customSession;

    if (!isAuthenticated) {
      // Check NextAuth session token cookies (standard or secure variant)
      const nextAuthToken = request.cookies.get('authjs.session-token')?.value || request.cookies.get('__Secure-authjs.session-token')?.value || request.cookies.get('next-auth.session-token')?.value || request.cookies.get('__Secure-next-auth.session-token')?.value;
      if (nextAuthToken) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === '/console' || pathname === '/console/') {
    return NextResponse.redirect(new URL('/console/dashboard', request.url));
  }

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const subpath = pathname.replace('/dashboard', '/console/dashboard');
    return NextResponse.redirect(new URL(subpath, request.url));
  }

  if (pathname === '/settings/billing') {
    return NextResponse.redirect(new URL('/console/billing', request.url));
  }

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
