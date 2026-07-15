import { db } from '@/db';
import { users, events } from '@/db/schema';
import { sql, eq, desc } from 'drizzle-orm';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { GlassPanel } from '@/components/GlassPanel';
import { rel } from '@/lib/format';

const th = { textAlign: 'left', padding: '.6rem .9rem', fontSize: '.68rem', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-mute)', fontWeight: 500 } as const;
const td = { padding: '.65rem .9rem', fontSize: '.83rem', borderTop: '1px solid var(--border)' } as const;

export default async function UsersPage() {
  const rows = await db
    .select({
      id: users.id, name: users.name, email: users.email, createdAt: users.createdAt,
      eventCount: sql<number>`count(${events.id})::int`,
      lastSeen: sql<string | null>`max(${events.createdAt})`.mapWith(String),
    })
    .from(users)
    .leftJoin(events, eq(events.userId, users.id))
    .groupBy(users.id, users.name, users.email, users.createdAt)
    .orderBy(desc(sql`count(${events.id})`));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <PageHeading title="Users" subtitle={`${rows.length} known accounts and their activity`} />
      <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>User</th><th style={th}>Email</th><th style={th}>Joined</th><th style={th}>Events</th><th style={th}>Last seen</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: '.68rem', fontWeight: 600, background: 'var(--accent)', color: 'var(--accent-contrast)' }}>{(u.name ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</span>
                      {u.name ?? '—'}
                    </span>
                  </td>
                  <td style={td}><span className="text-dim mono" style={{ fontSize: '.78rem' }}>{u.email}</span></td>
                  <td style={td}><span className="text-dim">{u.createdAt ? new Date(u.createdAt as unknown as string).toLocaleDateString() : '—'}</span></td>
                  <td style={td}><span className="mono">{u.eventCount}</span></td>
                  <td style={td}><span className="text-dim">{u.lastSeen ? rel(new Date(u.lastSeen).toISOString()) : '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
