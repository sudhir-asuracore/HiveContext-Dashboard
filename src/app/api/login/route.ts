import { NextResponse } from 'next/server';
import { verifyOwnerPassword } from '@/lib/owner-password';
import { createSession, SESSION_COOKIE_NAME, sessionLifetimeSeconds, signSession } from '@/lib/session';
import { logAuthEvent } from '@/lib/auth-logger';

export async function POST(request: Request) {
  const { username, password } = await request.json().catch(() => ({}));
  const owner = process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent') || null;

  if (typeof username !== 'string' || typeof password !== 'string' || !owner) {
    await logAuthEvent({
      username: typeof username === 'string' ? username : 'unknown',
      authMethod: 'credentials',
      status: 'FAILED',
      ipAddress,
      userAgent,
      errorMessage: 'Missing credentials or unconfigured owner',
    });
    return NextResponse.json({ error: 'Invalid credentials', debugHash: hash }, { status: 401 });
  }

  try {
    if (username === owner && await verifyOwnerPassword(password)) {
      const session = await createSession(owner);
      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: await signSession(session),
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: sessionLifetimeSeconds(),
      });

      await logAuthEvent({
        username,
        authMethod: 'credentials',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      });

      return response;
    }
  } catch (error: any) {
    console.error('Console authentication configuration error:', error);
    await logAuthEvent({
      username,
      authMethod: 'credentials',
      status: 'FAILED',
      ipAddress,
      userAgent,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: 'Console authentication is unavailable: ' + error.message }, { status: 503 });
  }

  await logAuthEvent({
    username,
    authMethod: 'credentials',
    status: 'FAILED',
    ipAddress,
    userAgent,
    errorMessage: 'Invalid username or password',
  });

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
