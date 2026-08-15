export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-surface-sunk ${className}`}
      aria-hidden="true"
    />
  );
}

/** A list of placeholder rows shaped like the app's tables and panels. */
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Caricamento in corso">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
        >
          <Skeleton className="h-5 w-5 shrink-0" />
          <Skeleton className="h-2 w-1/3" />
          <Skeleton className="ml-auto h-2 w-16" />
        </div>
      ))}
    </div>
  );
}
