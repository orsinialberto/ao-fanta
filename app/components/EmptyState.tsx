import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Icon size={24} strokeWidth={1.5} className="text-ink-3" />
      <p className="text-h3">{title}</p>
      {description && (
        <p className="max-w-[32ch] text-small text-ink-3">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
