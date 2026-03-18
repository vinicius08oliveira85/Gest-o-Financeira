import type { Entry } from '../types';
import { formatCurrency, parseDateLocal } from '../lib/format';

type CalendarViewProps = {
  entries: Entry[];
  month: number;
  year: number;
};

type DayBucket = {
  date: Date;
  entries: Entry[];
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarView({ entries, month, year }: CalendarViewProps) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0-6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const buckets: Record<number, DayBucket> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    buckets[day] = {
      date,
      entries: [],
    };
  }

  for (const entry of entries) {
    const d = parseDateLocal(entry.dueDate);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (buckets[day]) {
        buckets[day].entries.push(entry);
      }
    }
  }

  const cells: (DayBucket | null)[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(buckets[day]);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDay = today.getDate();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-3 md:p-4">
      <div className="grid grid-cols-7 gap-1 mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center">
        {WEEK_DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {cells.map((bucket, idx) => {
          if (!bucket) {
            return <div key={idx} className="h-16 md:h-20 rounded-xl border border-transparent" />;
          }

          const day = bucket.date.getDate();
          const isToday = isCurrentMonth && day === todayDay;
          const entradas = bucket.entries.filter((e) => e.type === 'cash' && !e.goalId);
          const saidas = bucket.entries.filter((e) => e.type === 'debt' && !e.goalId);
          const totalEntradas = entradas.reduce((acc, e) => acc + e.amount, 0);
          const totalSaidas = saidas.reduce((acc, e) => acc + e.amount, 0);
          const hasInstallments = bucket.entries.some(
            (e) => e.installmentsCount && e.installmentNumber
          );

          const visible = bucket.entries.slice(0, 2);
          const remaining = bucket.entries.length - visible.length;

          return (
            <div
              key={idx}
              className={`h-20 md:h-24 rounded-xl border px-1.5 py-1 flex flex-col gap-0.5 ${
                isToday
                  ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                  : hasInstallments
                    ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20'
                    : 'border-slate-100 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold ${
                    isToday
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {day}
                </span>
                <div className="flex flex-col items-end gap-0.5">
                  {totalEntradas > 0 && (
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      +{formatCurrency(totalEntradas)}
                    </span>
                  )}
                  {totalSaidas > 0 && (
                    <span className="text-[10px] text-red-600 font-semibold">
                      -{formatCurrency(totalSaidas)}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {visible.map((e) => (
                  <div
                    key={e.id}
                    className="truncate text-[10px] text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                        e.goalId
                          ? 'bg-amber-600'
                          : e.type === 'cash'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="truncate">
                      {e.name}
                      {e.installmentsCount && e.installmentNumber && (
                        <span className="ml-1 text-[9px] text-slate-500 dark:text-slate-400">
                          {e.installmentNumber}/{e.installmentsCount}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {remaining > 0 && (
                  <div className="text-[9px] text-slate-500 dark:text-slate-400">
                    +{remaining} lançamentos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
