export default function TripsLoading() {
  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-10">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-2xl border p-4">
            <div className="h-28 w-40 shrink-0 animate-pulse rounded-xl bg-muted" />
            <div className="flex-1 space-y-2 pt-2">
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
