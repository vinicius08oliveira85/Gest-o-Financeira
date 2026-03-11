import type { Entry } from '../types';
import { formatCurrency } from '../lib/format';

type ReportsPanelProps = {
  entries: Entry[];
  month: number;
  year: number;
};

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

  const totalByCategory = byPeriod.reduce<Record<string, number>>((acc, d) => {
    if (!d.category) return acc;
    acc[d.category] = (acc[d.category] ?? 0) + d.amount;
    return acc;
  }, {});

  const categoryEntries = Object.entries(totalByCategory).sort(
    (a, b) => b[1] - a[1]
  );

  const maxCategoryValue =
    categoryEntries.length > 0 ? categoryEntries[0][1] : 0;

  const monthLabel = new Date(year, month).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  if (byPeriod.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Relatórios de {monthLabel}
        </h2>
        <p className="text-xs text-slate-500">
          Visão rápida de entradas, saídas e categorias.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Entradas x Saídas
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Entradas</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(totalByType.entradas)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width:
                    totalByType.entradas + totalByType.saidas === 0
                      ? '0%'
                      : `${
                          (totalByType.entradas /
                            (totalByType.entradas + totalByType.saidas)) *
                          100
                        }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Saídas</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(totalByType.saidas)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{
                  width:
                    totalByType.entradas + totalByType.saidas === 0
                      ? '0%'
                      : `${
                          (totalByType.saidas /
                            (totalByType.entradas + totalByType.saidas)) *
                          100
                        }%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Distribuição por categoria
          </h3>
          {categoryEntries.length === 0 ? (
            <p className="text-xs text-slate-500">
              Adicione categorias aos lançamentos para ver a distribuição.
            </p>
          ) : (
            <div className="space-y-2">
              {categoryEntries.map(([cat, value]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate max-w-[140px]">{cat}</span>
                    <span className="font-medium">{formatCurrency(value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-900 transition-all"
                      style={{
                        width:
                          maxCategoryValue === 0
                            ? '0%'
                            : `${(value / maxCategoryValue) * 100}%`,
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

