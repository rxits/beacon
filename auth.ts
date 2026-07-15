import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';
import authConfig from './auth.config';

const providers: NextAuthConfig['providers'] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(creds) {
      const email = String(creds?.email ?? '').toLowerCase().trim();
      const password = String(creds?.password ?? '');
      if (!email || !password) return null;
      const u = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!u?.passwordHash) return null;
      const ok = await bcrypt.compare(password, u.passwordHash);
      if (!ok) return null;
      return { id: u.id, name: u.name, email: u.email, image: u.image };
    },
  }),
];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users, accountsTable: accounts,
    sessionsTable: sessions, verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
