export function DetailSkeleton() {
  return (
    <div className="page-width px-4 py-8 lg:px-8">
      <div className="h-8 w-52 animate-pulse rounded bg-surface-secondary" />
      <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded bg-surface-secondary/70" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-16 animate-pulse rounded-lg bg-surface" key={index} />
        ))}
      </div>
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
