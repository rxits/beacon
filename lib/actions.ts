'use server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { signIn, auth, unstable_update } from '@/auth';
import { rateLimit } from '@/lib/ratelimit';
import { clientIpFromHeaders } from '@/lib/ip';

export type AuthState = { error?: string };
export type ProfileState = { error?: string; ok?: boolean };

const Login = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });
const Signup = z.object({ name: z.string().min(1).max(80), email: z.string().email().max(200), password: z.string().min(8).max(200) });
const GUEST_EMAIL = 'guest@beacon.local';
const GUEST_PASSWORD = 'guest-pass-beacon';

async function clientIp(): Promise<string> {
  return clientIpFromHeaders(await headers());
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!rateLimit(`login:${await clientIp()}`, 8, 60_000)) return { error: 'Too many attempts — please wait a minute.' };
  const parsed = Login.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'Enter a valid email and password.' };
  try { await signIn('credentials', { ...parsed.data, redirectTo: '/dashboard' }); }
  catch (e) { if (e instanceof AuthError) return { error: 'Invalid email or password.' }; throw e; }
  return {};
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!rateLimit(`signup:${await clientIp()}`, 5, 60_000)) return { error: 'Too many attempts — please wait a minute.' };
  const parsed = Signup.safeParse({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'Fill every field; password needs 8+ characters.' };
  const email = parsed.data.email.toLowerCase();
  if (await db.query.users.findFirst({ where: eq(users.email, email) })) return { error: 'An account with that email already exists.' };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.insert(users).values({ name: parsed.data.name, email, passwordHash });
  try { await signIn('credentials', { email, password: parsed.data.password, redirectTo: '/dashboard' }); }
  catch (e) { if (e instanceof AuthError) return { error: 'Account created — please sign in.' }; throw e; }
  return {};
}

export async function googleAction(): Promise<void> {
  await signIn('google', { redirectTo: '/dashboard' });
}

export async function guestAction(): Promise<void> {
  if (!rateLimit(`guest:${await clientIp()}`, 10, 60_000)) return;
  const existing = await db.query.users.findFirst({ where: eq(users.email, GUEST_EMAIL) });
  if (!existing) {
    const passwordHash = await bcrypt.hash(GUEST_PASSWORD, 12);
    await db.insert(users).values({ name: 'Guest', email: GUEST_EMAIL, passwordHash });
  }
  await signIn('credentials', { email: GUEST_EMAIL, password: GUEST_PASSWORD, redirectTo: '/dashboard' });
}

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not signed in.' };
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (name.length < 1 || name.length > 80) return { error: 'Name must be 1–80 characters.' };
  const patch: { name: string; passwordHash?: string } = { name };
  if (password) {
    if (password.length < 8 || password.length > 200) return { error: 'New password needs 8–200 characters.' };
    patch.passwordHash = await bcrypt.hash(password, 12);
  }
  await db.update(users).set(patch).where(eq(users.id, session.user.id));
  await unstable_update({ user: { name } });
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
