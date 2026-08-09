import { motion } from 'motion/react';
import { TrendingDown, DollarSign, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../lib/format';

type DashboardCardsProps = {
  totalEntradasLancadas: number;
  totalSaidasLancadas: number;
  saldo: number;
  entradasCount: number;
  saidasCount: number;
  totalEntradasFinalizadas?: number;
  totalEntradasPendentes?: number;
  totalSaidasFinalizadas?: number;
  totalSaidasPendentes?: number;
  /** Saldo projetado (total entradas - total saídas do mês) */
  saldoProjetado?: number;
  /** Ex.: "do mês" para indicar que os valores são do período selecionado */
  periodLabel?: string;
  /** Soma do limite disponível em todos os cartões de crédito no período */
  totalLimiteDisponivel?: number;
};

export function DashboardCards({
  totalEntradasLancadas,
  totalSaidasLancadas,
  saldo,
  entradasCount,
  saidasCount,
  totalEntradasFinalizadas,
  totalEntradasPendentes,
  totalSaidasFinalizadas,
  totalSaidasPendentes,
  saldoProjetado,
  periodLabel,
  totalLimiteDisponivel,
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
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Entradas{suffix}
          </span>
          <div className="neu-icon-badge-emerald p-1.5">
            <ArrowUpRight className="text-emerald-500 w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-emerald-600 dark:text-emerald-400">
          {formatCurrency(totalEntradasLancadas)}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {entradasCount} entradas lançadas
        </div>
        {(totalEntradasFinalizadas !== undefined || totalEntradasPendentes !== undefined) && (
          <div className="mt-1.5 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-1.5">
            {totalEntradasFinalizadas !== undefined && (
              <div className="flex items-center justify-between text-3xs">
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
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
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                  Pendentes
                </span>
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {formatCurrency(totalEntradasPendentes)}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="neu-surface card-pad rounded-xl flex flex-col h-full"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Saídas{suffix}
          </span>
          <div className="neu-icon-badge-red p-1.5">
            <TrendingDown className="text-red-500 w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-red-600 dark:text-red-400">
          {formatCurrency(totalSaidasLancadas)}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {saidasCount} saídas lançadas
        </div>
        {(totalSaidasFinalizadas !== undefined || totalSaidasPendentes !== undefined) && (
          <div className="mt-1.5 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-1.5">
            {totalSaidasFinalizadas !== undefined && (
              <div className="flex items-center justify-between text-3xs">
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
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
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                  Pendentes
                </span>
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {formatCurrency(totalSaidasPendentes)}
                </span>
              </div>
            )}
          </div>
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
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Saldo{suffix}
          </span>
          <div className="neu-inset-sm p-1.5 rounded-full">
            <DollarSign className="text-white w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white">
          {formatCurrency(saldo)}
        </div>
        <div className="mt-1 text-xs text-slate-400">Só entradas e saídas finalizadas</div>
        {saldoProjetado !== undefined && (
          <div className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5">
            <div className="flex items-center justify-between text-3xs">
              <span className="text-slate-400 flex items-center gap-1">
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
        {totalLimiteDisponivel !== undefined && (
          <div className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5">
            <div className="flex items-center justify-between text-3xs">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                Limite cartões
              </span>
              <span className="font-medium text-blue-300">
                {formatCurrency(totalLimiteDisponivel)}
              </span>
            </div>
            <div className="flex items-center justify-between text-3xs">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60" />
                Total disponível
              </span>
              <span className="font-medium text-white">
                {formatCurrency(saldo + totalLimiteDisponivel)}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
