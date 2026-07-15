import {
  pgTable, text, timestamp, primaryKey, integer, doublePrecision,
  pgEnum, uuid, index,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]);

export const deviceType = pgEnum('device_type', ['desktop', 'mobile', 'tablet', 'bot', 'unknown']);
export const eventType = pgEnum('event_type', ['page_view', 'login', 'signup', 'click']);

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  ip: text('ip'),
  ipHash: text('ip_hash'),
  localIp: text('local_ip'),
  country: text('country'),
  countryCode: text('country_code'),
  region: text('region'),
  city: text('city'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  browser: text('browser'),
  os: text('os'),
  deviceType: deviceType('device_type').default('unknown'),
  path: text('path'),
  referrer: text('referrer'),
  eventType: eventType('event_type').notNull().default('page_view'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('events_created_at_idx').on(t.createdAt),
  index('events_country_code_idx').on(t.countryCode),
  index('events_user_id_idx').on(t.userId),
]);

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
