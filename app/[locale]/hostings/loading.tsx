export default function HostingsLoading() {
  return (
    <main className="mx-auto max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl border bg-card" />
            <div className="h-24 animate-pulse rounded-xl border" />
          </div>
        ))}
      </div>
    </main>
  );
}
