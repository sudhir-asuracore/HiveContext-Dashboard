import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the custom username/password session cookie
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });

  // Clear any NextAuth session tokens
  response.cookies.set({
    name: 'authjs.session-token',
    value: '',
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });

  response.cookies.set({
    name: '__Secure-authjs.session-token',
    value: '',
    httpOnly: true,
    path: '/',
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
  });

  return response;
}
