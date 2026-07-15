import { auth } from '@/auth';
import { PageHeading } from '@/components/dashboard/PageHeading';
import { SettingsView } from '@/components/dashboard/SettingsView';

export default async function SettingsPage() {
  const session = await auth();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <PageHeading title="Settings" subtitle="Account, appearance, and privacy" />
      <SettingsView name={session?.user?.name ?? null} email={session?.user?.email ?? null} />
    </div>
  );
}
