import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAdminEmail } from '@/lib/admin-emails';
import { logAuthEvent } from '@/lib/auth-logger';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        await logAuthEvent({
          username: 'unknown_google_user',
          authMethod: 'google_oauth',
          status: 'FAILED',
          errorMessage: 'No email returned from Google OAuth',
        });
        return false;
      }
      const allowed = isAdminEmail(user.email);
      await logAuthEvent({
        username: user.email,
        authMethod: 'google_oauth',
        status: allowed ? 'SUCCESS' : 'ACCESS_DENIED',
        errorMessage: allowed ? null : 'Google account email not in allowed ADMIN_EMAILS list',
      });
      return allowed;
    },
    async session({ session }) {
      if (session.user?.email) {
        (session as any).owner = session.user.email;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
