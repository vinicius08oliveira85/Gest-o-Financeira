export function LoadingSkeleton() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 animate-pulse"
          >
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-2/3 mb-4" />
            <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/3" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 mb-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded-xl w-64 animate-pulse" />
        <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded w-32 animate-pulse" />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-600">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
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
    </main>
  );
}
