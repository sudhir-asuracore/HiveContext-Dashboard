import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAdminEmail } from '@/lib/admin-emails';

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
      if (!user.email) return false;
      return isAdminEmail(user.email);
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
