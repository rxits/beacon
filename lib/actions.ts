'use server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { AuthError } from 'next-auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { signIn } from '@/auth';

export type AuthState = { error?: string };

const Login = z.object({ email: z.string().email(), password: z.string().min(1) });
const Signup = z.object({ name: z.string().min(1).max(80), email: z.string().email(), password: z.string().min(8).max(200) });

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = Login.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'Enter a valid email and password.' };
  try {
    await signIn('credentials', { ...parsed.data, redirectTo: '/dashboard' });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Invalid email or password.' };
    throw e;
  }
  return {};
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = Signup.safeParse({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: 'Fill every field; password needs 8+ characters.' };
  const email = parsed.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { error: 'An account with that email already exists.' };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.insert(users).values({ name: parsed.data.name, email, passwordHash });
  try {
    await signIn('credentials', { email, password: parsed.data.password, redirectTo: '/dashboard' });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Account created — please sign in.' };
    throw e;
  }
  return {};
}

export async function googleAction(): Promise<void> {
  await signIn('google', { redirectTo: '/dashboard' });
}
