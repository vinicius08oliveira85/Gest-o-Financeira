export function LoadingSkeleton() {
  return (
    <div className="section-stack">
      <div className="dashboard-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="neu-surface card-pad rounded-xl animate-pulse">
            <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-2/3 mb-2" />
            <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded w-1/2 mb-1" />
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded w-1/3" />
          </div>
        ))}
      </div>
      <div className="toolbar-row">
        <div className="h-7 bg-slate-200 dark:bg-slate-600 rounded-xl w-full max-w-xs animate-pulse" />
        <div className="h-7 bg-slate-100 dark:bg-slate-700 rounded w-full max-w-[8rem] animate-pulse" />
      </div>
      <div className="neu-surface rounded-xl overflow-hidden">
        <div className="neu-divide">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-pad flex items-center gap-[var(--inline-gap)]">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-1/3 mb-2 animate-pulse" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-5 bg-slate-200 dark:bg-slate-600 rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
