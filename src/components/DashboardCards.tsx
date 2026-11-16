import { motion } from 'motion/react';
import { TrendingDown, DollarSign, ArrowUpRight } from './icons';
import { formatCurrency } from '../lib/format';
import { DeltaBadge } from './DeltaBadge';

type DashboardCardsProps = {
  totalEntradasLancadas: number;
  totalSaidasLancadas: number;
  saldo: number;
  /** Saldo de todos os lançamentos finalizados, de todos os meses. */
  saldoAcumulado?: number;
  /** Posição antes do primeiro lançamento (0 quando não definida). */
  saldoInicial?: number;
  onEditSaldoInicial?: () => void;
  entradasCount: number;
  saidasCount: number;
  /** Parcelas de empréstimo em aberto somadas às saídas do mês (não são lançamentos). */
  saidasParcelas?: number;
  totalEntradasFinalizadas?: number;
  totalEntradasPendentes?: number;
  totalSaidasFinalizadas?: number;
  totalSaidasPendentes?: number;
  /** Saldo projetado (total entradas - total saídas do mês) */
  saldoProjetado?: number;
  /** Ex.: "do mês" para indicar que os valores são do período selecionado */
  periodLabel?: string;
  /** Totais do mês anterior (para o comparativo ▲/▼) */
  prevEntradasLancadas?: number;
  prevSaidasLancadas?: number;
  prevSaldo?: number;
  /** Levam o usuário ao detalhe de cada número (aba e filtros já aplicados). */
  onOpenEntradas?: () => void;
  onOpenSaidas?: () => void;
  onOpenCards?: () => void;
};

export function DashboardCards({
  totalEntradasLancadas,
  totalSaidasLancadas,
  saldo,
  saldoAcumulado,
  saldoInicial,
  onEditSaldoInicial,
  entradasCount,
  saidasCount,
  saidasParcelas = 0,
  totalEntradasFinalizadas,
  totalEntradasPendentes,
  totalSaidasFinalizadas,
  totalSaidasPendentes,
  saldoProjetado,
  periodLabel,
  prevEntradasLancadas,
  prevSaidasLancadas,
  prevSaldo,
  onOpenEntradas,
  onOpenSaidas,
  onOpenCards,
}: DashboardCardsProps) {
  const suffix = periodLabel ? ` ${periodLabel}` : '';
  return (
    <div className="dashboard-grid">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="neu-surface card-pad rounded-xl flex flex-col h-full"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold whitespace-nowrap text-slate-600 dark:text-slate-400">
            Entradas{suffix}
          </span>
          <div className="neu-icon-badge-emerald p-1.5">
            <ArrowUpRight className="text-emerald-500 w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-emerald-600 dark:text-emerald-400">
          {formatCurrency(totalEntradasLancadas)}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>{entradasCount} entradas lançadas</span>
          {prevEntradasLancadas !== undefined && (
            <DeltaBadge current={totalEntradasLancadas} previous={prevEntradasLancadas} />
          )}
        </div>
        {(totalEntradasFinalizadas !== undefined || totalEntradasPendentes !== undefined) && (
          <div className="mt-1.5 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-1.5">
            {totalEntradasFinalizadas !== undefined && (
              <div className="flex items-center justify-between text-3xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Finalizadas
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalEntradasFinalizadas)}
                </span>
              </div>
            )}
            {totalEntradasPendentes !== undefined && (
              <div className="flex items-center justify-between text-3xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                  Pendentes
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  {formatCurrency(totalEntradasPendentes)}
                </span>
              </div>
            )}
          </div>
        )}
        {onOpenEntradas && (
          <button
            type="button"
            onClick={onOpenEntradas}
            className="mt-2 self-start rounded text-2xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Ver entradas
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="neu-surface card-pad rounded-xl flex flex-col h-full"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold whitespace-nowrap text-slate-600 dark:text-slate-400">
            Saídas{suffix}
          </span>
          <div className="neu-icon-badge-red p-1.5">
            <TrendingDown className="text-red-500 w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-red-600 dark:text-red-400">
          {formatCurrency(totalSaidasLancadas)}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>
            {saidasCount} saídas lançadas
            {saidasParcelas > 0 ? ` + ${saidasParcelas} parcelas` : ''}
          </span>
          {prevSaidasLancadas !== undefined && (
            <DeltaBadge current={totalSaidasLancadas} previous={prevSaidasLancadas} invert />
          )}
        </div>
        {(totalSaidasFinalizadas !== undefined || totalSaidasPendentes !== undefined) && (
          <div className="mt-1.5 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-1.5">
            {totalSaidasFinalizadas !== undefined && (
              <div className="flex items-center justify-between text-3xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                  Finalizadas
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(totalSaidasFinalizadas)}
                </span>
              </div>
            )}
            {totalSaidasPendentes !== undefined && (
              <div className="flex items-center justify-between text-3xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                  Pendentes
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  {formatCurrency(totalSaidasPendentes)}
                </span>
              </div>
            )}
          </div>
        )}
        {onOpenSaidas && (
          <button
            type="button"
            onClick={onOpenSaidas}
            className="mt-2 self-start rounded text-2xs font-medium text-red-700 dark:text-red-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Ver saídas
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`card-pad rounded-xl flex flex-col h-full ${
          saldo >= 0 ? 'neu-surface-accent-dark' : 'neu-surface-accent-danger'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold whitespace-nowrap text-white/70">
            Saldo{suffix}
          </span>
          <div className="rounded-full bg-white/15 p-1.5">
            <DollarSign className="text-white w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white">
          {formatCurrency(saldo)}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-white/70">
          <span>Só entradas e saídas finalizadas</span>
          {prevSaldo !== undefined && <DeltaBadge current={saldo} previous={prevSaldo} light />}
        </div>
        {saldoProjetado !== undefined && (
          <div className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5">
            <div className="flex items-center justify-between text-3xs">
              <span
                className="flex items-center gap-1 text-white/70"
                title="Todas as entradas e saídas do mês, finalizadas ou não"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
                Projetado
              </span>
              <span
                className={`font-medium ${
                  saldoProjetado >= 0 ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {formatCurrency(saldoProjetado)}
              </span>
            </div>
          </div>
        )}
        {saldoAcumulado !== undefined && (
          <div className="mt-1.5 border-t border-white/10 pt-1.5">
            <div
              className="flex items-center justify-between text-3xs"
              title="Saldo inicial + todas as entradas finalizadas menos todas as saídas finalizadas"
            >
              <span className="flex items-center gap-1 text-white/70">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60" />
                {saldoInicial ? 'Saldo atual' : 'Acumulado (todos os meses)'}
              </span>
              <span className="font-medium text-white">
                {formatCurrency(saldoAcumulado + (saldoInicial ?? 0))}
              </span>
            </div>
            {onEditSaldoInicial && (
              <button
                type="button"
                onClick={onEditSaldoInicial}
                className="mt-1 rounded text-2xs font-medium text-blue-200 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {saldoInicial ? 'Ajustar saldo inicial' : 'Definir saldo inicial'}
              </button>
            )}
          </div>
        )}
        {onOpenCards && (
          <button
            type="button"
            onClick={onOpenCards}
            className="mt-2 self-start rounded text-2xs font-medium text-blue-200 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Ver cartões
          </button>
        )}
      </motion.div>
    </div>
  );
}
