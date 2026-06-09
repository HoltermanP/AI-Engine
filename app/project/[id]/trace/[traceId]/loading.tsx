export default function TraceLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 bg-white/60 px-4 py-2">
        <div className="h-10 animate-pulse rounded-xl bg-muted/60" />
      </div>
      <div className="workspace-header flex items-center gap-3 px-4 py-2">
        <div className="h-7 w-20 animate-pulse rounded-full bg-muted/60" />
        <div className="h-7 w-32 animate-pulse rounded-full bg-muted/60" />
      </div>
      <div className="h-14 animate-pulse border-b border-border bg-muted/30" />
      <div className="min-h-0 flex-1 animate-pulse bg-muted/20" />
    </div>
  );
}
