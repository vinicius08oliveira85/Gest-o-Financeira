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
}: DashboardCardsProps) {
  const suffix = periodLabel ? ` ${periodLabel}` : '';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 flex flex-col h-full"
      >
        <div className="flex items-start justify-between mb-4 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Entradas{suffix}
          </span>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-full">
            <ArrowUpRight className="text-emerald-500 w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-light tracking-tight text-emerald-600 dark:text-emerald-400 mt-auto">
          {formatCurrency(totalEntradasLancadas)}
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>{entradasCount} entradas lançadas</span>
        </div>
        {(totalEntradasFinalizadas !== undefined || totalEntradasPendentes !== undefined) && (
          <div className="mt-2 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-2">
            {totalEntradasFinalizadas !== undefined && (
              <div className="flex items-center justify-between text-[11px]">
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
              <div className="flex items-center justify-between text-[11px]">
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
        className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 flex flex-col h-full"
      >
        <div className="flex items-start justify-between mb-4 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Saídas{suffix}
          </span>
          <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-full">
            <TrendingDown className="text-red-500 w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-light tracking-tight text-red-600 dark:text-red-400 mt-auto">
          {formatCurrency(totalSaidasLancadas)}
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>{saidasCount} saídas lançadas</span>
        </div>
        {(totalSaidasFinalizadas !== undefined || totalSaidasPendentes !== undefined) && (
          <div className="mt-2 space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-2">
            {totalSaidasFinalizadas !== undefined && (
              <div className="flex items-center justify-between text-[11px]">
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
              <div className="flex items-center justify-between text-[11px]">
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
        className={`p-4 sm:p-6 rounded-2xl shadow-sm border flex flex-col h-full ${
          saldo >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-red-800 border-red-700'
        }`}
      >
        <div className="flex items-start justify-between mb-4 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Saldo{suffix}
          </span>
          <div className="bg-white/10 p-2 rounded-full">
            <DollarSign className="text-white w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-light tracking-tight text-white mt-auto">
          {formatCurrency(saldo)}
        </div>
        <div className="mt-2 text-xs text-slate-400">Só entradas e saídas finalizadas</div>
        {saldoProjetado !== undefined && (
          <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
            <div className="flex items-center justify-between text-[11px]">
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
      </motion.div>
    </div>
  );
}
