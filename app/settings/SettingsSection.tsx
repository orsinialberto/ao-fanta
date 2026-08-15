export default function SettingsSection({
  title,
  hint,
  description,
  children,
}: {
  title: string;
  hint?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="text-h2">{title}</h2>
        {hint && (
          <span className="shrink-0 font-mono text-small-dense tabular-nums text-ink-3">{hint}</span>
        )}
      </div>
      {description && <p className="mb-4 max-w-[56ch] text-small text-ink-2">{description}</p>}
      {children}
    </section>
  );
}
