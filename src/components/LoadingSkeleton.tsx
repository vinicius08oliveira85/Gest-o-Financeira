export function LoadingSkeleton() {
  return (
    <div className="section-stack">
      <div className="dashboard-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="neu-surface card-pad rounded-xl">
            <div className="animate-shimmer h-3 rounded w-2/3 mb-2" />
            <div className="animate-shimmer h-6 rounded w-1/2 mb-1" />
            <div className="animate-shimmer h-2 rounded w-1/3" />
          </div>
        ))}
      </div>
      <div className="toolbar-row">
        <div className="animate-shimmer h-7 rounded-xl w-full max-w-xs" />
        <div className="animate-shimmer h-7 rounded w-full max-w-[8rem]" />
      </div>
      <div className="neu-surface rounded-xl overflow-hidden">
        <div className="neu-divide">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-pad flex items-center gap-[var(--inline-gap)]">
              <div className="animate-shimmer w-6 h-6 rounded-full" />
              <div className="flex-1">
                <div className="animate-shimmer h-4 rounded w-1/3 mb-2" />
                <div className="animate-shimmer h-3 rounded w-1/4" />
              </div>
              <div className="animate-shimmer h-5 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
