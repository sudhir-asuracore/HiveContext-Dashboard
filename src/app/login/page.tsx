'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authError = searchParams.get('error');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      setError('Unable to sign in with those credentials.');
      return;
    }

    const next = searchParams.get('next');
    router.replace(next?.startsWith('/console') ? next : '/console/dashboard');
    router.refresh();
  }

  const handleGoogleSignIn = () => {
    const next = searchParams.get('next');
    signIn('google', { callbackUrl: next?.startsWith('/console') ? next : '/console/dashboard' });
  };

  return (
    <main className="min-h-screen bg-[#111111] px-6 py-16 text-white">
      <section className="mx-auto max-w-md border border-white/20 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-500">HiveContext</p>
        <h1 className="mt-4 text-3xl font-bold">Console sign in</h1>
        <p className="mt-2 text-sm text-white/70">Sign in with owner credentials or Google OAuth.</p>

        {(error || authError) && (
          <div className="mt-4 border border-red-500/50 bg-red-950/30 p-3 text-sm text-red-400" role="alert">
            {authError === 'AccessDenied'
              ? 'Access denied. Your Google account email is not in the allowed admin list.'
              : error || 'An error occurred during authentication.'}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="mt-6 flex w-full items-center justify-center gap-3 border border-white/30 bg-white/5 py-3 text-sm font-semibold transition hover:bg-white/10"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 23z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-xs uppercase text-white/50">Or credentials</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Username
            <input className="mt-2 w-full border border-white/30 bg-transparent px-3 py-2" name="username" required autoComplete="username" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input className="mt-2 w-full border border-white/30 bg-transparent px-3 py-2" type="password" name="password" required autoComplete="current-password" />
          </label>
          <button className="w-full bg-red-600 px-4 py-3 text-sm font-bold disabled:opacity-50" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}