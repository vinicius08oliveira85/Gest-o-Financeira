import { formatCurrency, formatDate } from '../lib/format';
import type { Goal } from '../types';

type GoalsCardProps = {
  goal: Goal | null;
  metaBalance: number;
  isLoading?: boolean;
  onOpenModal: () => void;
  onDeposit: (goal: Goal) => void;
  onWithdraw: (goal: Goal) => void;
};

export function GoalsCard({
  goal,
  metaBalance,
  isLoading = false,
  onOpenModal,
  onDeposit,
  onWithdraw,
}: GoalsCardProps) {
  if (isLoading) {
    return (
      <div className="neu-surface card-pad rounded-2xl space-y-[var(--section-gap)] animate-pulse">
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

  const isComplete = progress >= 100;

  return (
    <div className="neu-surface card-pad rounded-xl section-stack">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isComplete ? '✓ Meta concluída' : 'Meta'}
          </p>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {goal ? goal.name : 'Nenhuma meta definida'}
          </h2>
          {goal?.targetDate && (
            <p className="text-3xs text-slate-500 dark:text-slate-400 mt-0.5">
              Até {formatDate(goal.targetDate)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="neu-btn text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-1.5 rounded-full whitespace-nowrap"
        >
          {goal ? 'Editar' : 'Criar meta'}
        </button>
      </div>

      {goal ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Progresso acumulado</span>
            <span
              className={`font-semibold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}
            >
              {isComplete ? '✓ ' : ''}
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 neu-progress-track">
            <div
              className={`h-full transition-all ${isComplete ? 'goal-progress-complete' : 'bg-emerald-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Depositado</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(Math.max(0, metaBalance))}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Alvo</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          {!isComplete && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Faltam</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatCurrency(Math.max(0, goal.targetAmount - metaBalance))}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onDeposit(goal)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold neu-btn-success"
            >
              Depositar
            </button>
            <button
              type="button"
              onClick={() => onWithdraw(goal)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold neu-btn text-slate-700 dark:text-slate-200"
            >
              Sacar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Defina uma meta financeira e acompanhe seu progresso ao longo dos meses.
        </p>
      )}
    </div>
  );
}
