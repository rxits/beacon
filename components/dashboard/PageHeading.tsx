export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '.3rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 660, letterSpacing: '-0.02em' }}>{title}</h1>
      {subtitle && <p className="text-mute" style={{ fontSize: '.85rem', marginTop: 2 }}>{subtitle}</p>}
    </div>
  );
}
