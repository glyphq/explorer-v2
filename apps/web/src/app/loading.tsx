export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="page-width px-4 py-8 lg:px-8">
      <span className="sr-only">Loading this route</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-secondary motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-surface-secondary/70 motion-reduce:animate-none" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none"
            key={`metric-${index}`}
          />
        ))}
      </div>
      <div className="mt-4 space-y-1 rounded-2xl bg-surface p-1.5">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            className="h-16 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none"
            key={`row-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
