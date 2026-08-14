import { NextResponse } from 'next/server';
import { verifyOwnerPassword } from '@/lib/owner-password';
import { createSession, SESSION_COOKIE_NAME, sessionLifetimeSeconds, signSession } from '@/lib/session';

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const owner = process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (typeof username !== 'string' || typeof password !== 'string' || !owner) {
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
      return response;
    }
  } catch (error: any) {
    console.error('Console authentication configuration error:', error);
    return NextResponse.json({ error: 'Console authentication is unavailable: ' + error.message }, { status: 503 });
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
