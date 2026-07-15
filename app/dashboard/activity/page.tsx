import { PageHeading } from '@/components/dashboard/PageHeading';
import { ActivityTable } from '@/components/dashboard/ActivityTable';

export default function ActivityPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <PageHeading title="Activity" subtitle="Every recorded visit — filter, search, paginate" />
      <ActivityTable />
    </div>
  );
}
