import type { Entry } from '../types';
import { formatCurrency } from '../lib/format';

type ReportsPanelProps = {
  entries: Entry[];
  month: number;
  year: number;
};

function formatCycleDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ReportsPanel({ entries, month, year }: ReportsPanelProps) {
  const byPeriod = entries.filter((d) => {
    const date = new Date(d.dueDate);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  const totalByType = byPeriod.reduce(
    (acc, d) => {
      if (d.type === 'cash') acc.entradas += d.amount;
      else acc.saidas += d.amount;
      return acc;
    },
    { entradas: 0, saidas: 0 }
  );

  const totalEntradasFinalizadas = byPeriod
    .filter((d) => d.type === 'cash' && d.isPaid)
    .reduce((acc, d) => acc + d.amount, 0);
  const totalSaidasFinalizadas = byPeriod
    .filter((d) => d.type === 'debt' && d.isPaid)
    .reduce((acc, d) => acc + d.amount, 0);
  const saldoDoMes = totalEntradasFinalizadas - totalSaidasFinalizadas;

  const totalByCategorySaidas = byPeriod.reduce<Record<string, number>>((acc, d) => {
    if (!d.category || d.type !== 'debt') return acc;
    acc[d.category] = (acc[d.category] ?? 0) + d.amount;
    return acc;
  }, {});

  const totalByCategoryEntradas = byPeriod.reduce<Record<string, number>>((acc, d) => {
    if (!d.category || d.type !== 'cash') return acc;
    acc[d.category] = (acc[d.category] ?? 0) + d.amount;
    return acc;
  }, {});

  const categorySaidasEntries = Object.entries(totalByCategorySaidas).sort((a, b) => b[1] - a[1]);
  const categoryEntradasEntries = Object.entries(totalByCategoryEntradas).sort(
    (a, b) => b[1] - a[1]
  );
  const maxCategorySaidas = categorySaidasEntries.length > 0 ? categorySaidasEntries[0][1] : 0;
  const maxCategoryEntradas =
    categoryEntradasEntries.length > 0 ? categoryEntradasEntries[0][1] : 0;

  const monthLabel = new Date(year, month).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const cycleStart = new Date(year, month, 1);
  const cycleEnd = new Date(year, month + 1, 0);
  const cycleLabel = `Ciclo: ${formatCycleDate(cycleStart)} a ${formatCycleDate(cycleEnd)}`;

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Relatórios de {monthLabel}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visão rápida de entradas, saídas e categorias.
          </p>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 w-fit">
          {cycleLabel}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total entradas
          </p>
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(totalByType.entradas)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total saídas
          </p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-0.5">
            {formatCurrency(totalByType.saidas)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saldo do mês
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
            {formatCurrency(saldoDoMes)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Entradas x Saídas
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Entradas</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(totalByType.entradas)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-600 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width:
                    totalByType.entradas + totalByType.saidas === 0
                      ? '0%'
                      : `${
                          (totalByType.entradas / (totalByType.entradas + totalByType.saidas)) * 100
                        }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Saídas</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(totalByType.saidas)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-600 overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{
                  width:
                    totalByType.entradas + totalByType.saidas === 0
                      ? '0%'
                      : `${
                          (totalByType.saidas / (totalByType.entradas + totalByType.saidas)) * 100
                        }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Categorias (saídas)
          </h3>
          {categorySaidasEntries.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adicione categorias às saídas para ver a distribuição.
            </p>
          ) : (
            <div className="space-y-2">
              {categorySaidasEntries.map(([cat, value]) => (
                <div key={`s-${cat}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="truncate max-w-[140px]">{cat}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(value)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-600 overflow-hidden">
                    <div
                      className="h-full bg-red-500 dark:bg-red-600 transition-all"
                      style={{
                        width:
                          maxCategorySaidas === 0 ? '0%' : `${(value / maxCategorySaidas) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Categorias (entradas)
          </h3>
          {categoryEntradasEntries.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adicione categorias às entradas para ver a distribuição.
            </p>
          ) : (
            <div className="space-y-2">
              {categoryEntradasEntries.map(([cat, value]) => (
                <div key={`e-${cat}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="truncate max-w-[140px]">{cat}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(value)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-600 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all"
                      style={{
                        width:
                          maxCategoryEntradas === 0
                            ? '0%'
                            : `${(value / maxCategoryEntradas) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
