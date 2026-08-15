export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6 border-b border-line pb-4">
      <h1 className="text-display">{title}</h1>
      {subtitle && <p className="mt-1 text-body text-ink-2">{subtitle}</p>}
    </header>
  );
}
