import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { ProfileForm } from '@/components/dashboard/ProfileForm';
import { SettingsView } from '@/components/dashboard/SettingsView';

export default async function SettingsPage() {
  const session = await auth();
  const me = session?.user?.id ? await db.query.users.findFirst({ where: eq(users.id, session.user.id) }) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <PageHeading title="Settings" subtitle="Account, appearance, and privacy" />
      <ProfileForm name={me?.name ?? session?.user?.name ?? null} email={me?.email ?? session?.user?.email ?? null} />
      <SettingsView />
    </div>
  );
}
