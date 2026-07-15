import type { NextAuthConfig } from 'next-auth';

export default {
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const onDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (onDashboard) return loggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
