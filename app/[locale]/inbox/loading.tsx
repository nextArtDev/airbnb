export default function InboxLoading() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <div className="mb-6 h-8 w-36 animate-pulse rounded bg-muted" />
      <div className="divide-y rounded-2xl border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
