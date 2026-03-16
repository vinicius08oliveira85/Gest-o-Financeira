import { formatCurrency, formatDate } from '../lib/format';
import type { Goal } from '../types';

type GoalsCardProps = {
  goal: Goal | null;
  monthLabel: string;
  saldoDoMes: number;
  metaBalance: number;
  isLoading?: boolean;
  onOpenModal: () => void;
  onDeposit: (goal: Goal) => void;
  onWithdraw: (goal: Goal) => void;
};

export function GoalsCard({
  goal,
  monthLabel,
  saldoDoMes,
  metaBalance,
  isLoading = false,
  onOpenModal,
  onDeposit,
  onWithdraw,
}: GoalsCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-3 animate-pulse">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-24 mb-2" />
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-40" />
          </div>
          <div className="h-8 w-20 bg-slate-100 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-16" />
            <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-10" />
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-600" />
          <div className="flex justify-between">
            <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-20" />
            <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  const progress =
    goal && goal.targetAmount > 0 ? Math.min(100, (metaBalance / goal.targetAmount) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Meta de {monthLabel}
          </p>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {goal ? goal.name : 'Nenhuma meta definida'}
          </h2>
          {goal?.targetDate && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Até {formatDate(goal.targetDate)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm"
        >
          {goal ? 'Editar meta' : 'Criar meta'}
        </button>
      </div>

      {goal ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Progresso</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-600 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Valor na meta</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metaBalance)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Meta</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onDeposit(goal)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
            >
              Depositar
            </button>
            <button
              type="button"
              onClick={() => onWithdraw(goal)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
            >
              Sacar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Defina uma meta simples para acompanhar quanto deseja guardar ou investir neste mês.
        </p>
      )}
    </div>
  );
}
