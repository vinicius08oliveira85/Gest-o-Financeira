import { useState } from 'react';
import { Download } from 'lucide-react';
import type { CardExpense, CreditCard, Entry } from '../types';
import { downloadCsv, formatCurrency, parseDateLocal } from '../lib/format';
import { buildMonthlyTrend, buildTrendCsv } from '../lib/monthlyTrend';
import { buildReportsCsv } from '../lib/reports';
import { chipClass } from '../lib/neu';
import { DeltaBadge } from './DeltaBadge';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { TREND_MONTHS_KEY } from '../constants';

type ReportsPanelProps = {
  entries: Entry[];
  month: number;
  year: number;
  cards?: CreditCard[];
  cardExpenses?: CardExpense[];
};

function formatCycleDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TREND_MONTHS_OPTIONS = [3, 6, 12] as const;
type TrendMonths = (typeof TREND_MONTHS_OPTIONS)[number];

function readTrendMonths(): TrendMonths {
  const value = Number(localStorage.getItem(TREND_MONTHS_KEY));
  return (TREND_MONTHS_OPTIONS as readonly number[]).includes(value) ? (value as TrendMonths) : 6;
}

export function ReportsPanel({
  entries,
  month,
  year,
  cards = [],
  cardExpenses = [],
}: ReportsPanelProps) {
  const byPeriod = entries.filter((d) => {
    const date = parseDateLocal(d.dueDate);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  // Depósito na meta (cash+goalId) → saída do caixa; Saque (debt+goalId) → entrada
  const isEntrada = (d: (typeof byPeriod)[0]) => (d.goalId ? d.type === 'debt' : d.type === 'cash');
  const isSaida = (d: (typeof byPeriod)[0]) => (d.goalId ? d.type === 'cash' : d.type === 'debt');

  const totalByType = byPeriod.reduce(
    (acc, d) => {
      if (isEntrada(d)) acc.entradas += d.amount;
      else acc.saidas += d.amount;
      return acc;
    },
    { entradas: 0, saidas: 0 }
  );

  const totalEntradasFinalizadas = byPeriod
    .filter((d) => d.isPaid && isEntrada(d))
    .reduce((acc, d) => acc + d.amount, 0);
  const totalSaidasFinalizadas = byPeriod
    .filter((d) => d.isPaid && isSaida(d))
    .reduce((acc, d) => acc + d.amount, 0);
  const saldoDoMes = totalEntradasFinalizadas - totalSaidasFinalizadas;

  const prevDate = new Date(year, month - 1, 1);
  const prevByPeriod = entries.filter((d) => {
    const date = parseDateLocal(d.dueDate);
    return date.getMonth() === prevDate.getMonth() && date.getFullYear() === prevDate.getFullYear();
  });
  const prevTotalEntradas = prevByPeriod
    .filter((d) => isEntrada(d))
    .reduce((acc, d) => acc + d.amount, 0);
  const prevTotalSaidas = prevByPeriod
    .filter((d) => isSaida(d))
    .reduce((acc, d) => acc + d.amount, 0);
  const prevEntradasFinalizadas = prevByPeriod
    .filter((d) => d.isPaid && isEntrada(d))
    .reduce((acc, d) => acc + d.amount, 0);
  const prevSaidasFinalizadas = prevByPeriod
    .filter((d) => d.isPaid && isSaida(d))
    .reduce((acc, d) => acc + d.amount, 0);
  const prevSaldo = prevEntradasFinalizadas - prevSaidasFinalizadas;

  const totalByCategorySaidas = byPeriod.reduce<Record<string, number>>((acc, d) => {
    if (!d.category || !isSaida(d)) return acc;
    acc[d.category] = (acc[d.category] ?? 0) + d.amount;
    return acc;
  }, {});

  const totalByCategoryEntradas = byPeriod.reduce<Record<string, number>>((acc, d) => {
    if (!d.category || !isEntrada(d)) return acc;
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

  const [trendMonths, setTrendMonths] = useState<TrendMonths>(readTrendMonths);

  const handleTrendMonths = (m: TrendMonths) => {
    setTrendMonths(m);
    localStorage.setItem(TREND_MONTHS_KEY, String(m));
  };

  const trend = buildMonthlyTrend(entries, month, year, trendMonths, cardExpenses, cards);

  // Faturas do mês por cartão (reutilizada na seção visual e no CSV do relatório)
  const cardTotals = cards.map((card) => ({
    id: card.id,
    name: card.name,
    total: cardExpenses
      .filter((e) => e.cardId === card.id && e.billingMonth === month && e.billingYear === year)
      .reduce((sum, e) => sum + e.amount, 0),
    limit: card.limitAmount,
  }));

  const handleExportTrend = () => {
    downloadCsv(
      buildTrendCsv(trend),
      `evolucao-mensal_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handleExportReports = () => {
    downloadCsv(
      buildReportsCsv({
        monthLabel,
        totals: {
          entradas: totalByType.entradas,
          saidas: totalByType.saidas,
          saldo: saldoDoMes,
          prevEntradas: prevTotalEntradas,
          prevSaidas: prevTotalSaidas,
          prevSaldo,
        },
        categories: { saidas: totalByCategorySaidas, entradas: totalByCategoryEntradas },
        cards: cardTotals,
      }),
      `relatorios_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <section className="section-stack">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Relatórios de {monthLabel}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportReports}
              aria-label="Exportar relatórios completos em CSV"
              className="neu-btn flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-medium text-slate-600 dark:text-slate-300 hover:opacity-75 active:scale-[0.98] transition-all"
              title="Exportar relatórios completos (KPIs, categorias e faturas) em CSV"
            >
              <Download size={14} />
              Exportar
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visão rápida de entradas, saídas e categorias.
            </p>
          </div>
        </div>
        <p className="neu-inset-sm text-xs font-medium text-slate-600 dark:text-slate-300 rounded-lg px-3 py-2 w-fit">
          {cycleLabel}
        </p>
      </div>

      <div className="reports-kpi-grid">
        <div className="neu-surface rounded-xl card-pad">
          <p className="text-3xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total entradas
          </p>
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(totalByType.entradas)}
          </p>
          <DeltaBadge current={totalByType.entradas} previous={prevTotalEntradas} />
        </div>
        <div className="neu-surface rounded-xl card-pad">
          <p className="text-3xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total saídas
          </p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-0.5">
            {formatCurrency(totalByType.saidas)}
          </p>
          <DeltaBadge current={totalByType.saidas} previous={prevTotalSaidas} invert />
        </div>
        <div className="neu-surface rounded-xl card-pad">
          <p className="text-3xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saldo do mês
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
            {formatCurrency(saldoDoMes)}
          </p>
          <DeltaBadge current={saldoDoMes} previous={prevSaldo} />
        </div>
      </div>

      <div className="reports-split-grid">
        <div className="neu-surface rounded-2xl card-pad section-stack">
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
            <div className="h-2 neu-progress-track">
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
            <div className="h-2 neu-progress-track">
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

        <div className="neu-surface rounded-2xl card-pad section-stack">
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
                  <div className="h-1.5 neu-progress-track">
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

        <div className="neu-surface rounded-2xl card-pad section-stack">
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
                  <div className="h-1.5 neu-progress-track">
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

      <div className="neu-surface rounded-2xl card-pad section-stack">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Evolução mensal
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="neu-inset flex p-1 rounded-full"
              role="group"
              aria-label="Período da evolução"
            >
              {TREND_MONTHS_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleTrendMonths(m)}
                  aria-pressed={trendMonths === m}
                  className={chipClass(trendMonths === m)}
                >
                  {m}m
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExportTrend}
              className="neu-btn flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-medium text-slate-600 dark:text-slate-300 hover:opacity-75 active:scale-[0.98] transition-all"
              title="Exportar evolução em CSV"
            >
              <Download size={14} />
              Exportar
            </button>
            <p className="text-3xs text-slate-400 dark:text-slate-500">
              Últimos {trend.length} meses (entradas e saídas lançadas)
            </p>
          </div>
        </div>
        <MonthlyTrendChart data={trend} />
      </div>

      {cards.length > 0 && (
        <div className="neu-surface rounded-2xl card-pad section-stack">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Faturas do mês
          </h3>
          <div className="space-y-3">
            {cardTotals.map((card) => {
              const usageRatio = card.limit > 0 ? card.total / card.limit : 0;
              const progressColor =
                usageRatio >= 0.9
                  ? 'bg-red-500'
                  : usageRatio >= 0.7
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';
              return (
                <div key={card.id}>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <span className="font-medium">{card.name}</span>
                    <span>
                      {formatCurrency(card.total)}{' '}
                      <span className="text-slate-400">/ {formatCurrency(card.limit)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 neu-progress-track">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor}`}
                      style={{ width: `${Math.min(usageRatio * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-3xs text-slate-400 mt-0.5">
                    {(usageRatio * 100).toFixed(0)}% do limite utilizado
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
