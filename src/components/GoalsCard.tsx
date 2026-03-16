import { formatCurrency, formatDate } from '../lib/format';
import type { Goal } from '../types';

type GoalsCardProps = {
  goal: Goal | null;
  monthLabel: string;
  saldoDoMes: number;
  isLoading?: boolean;
  onOpenModal: () => void;
};

export function GoalsCard({
  goal,
  monthLabel,
  saldoDoMes,
  isLoading = false,
  onOpenModal,
}: GoalsCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3 animate-pulse">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-40" />
          </div>
          <div className="h-8 w-20 bg-slate-100 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-slate-100 rounded w-16" />
            <div className="h-3 bg-slate-100 rounded w-10" />
          </div>
          <div className="h-2 rounded-full bg-slate-100" />
          <div className="flex justify-between">
            <div className="h-3 bg-slate-100 rounded w-20" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  const progress =
    goal && goal.targetAmount > 0 ? Math.min(100, (saldoDoMes / goal.targetAmount) * 100) : 0;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Meta de {monthLabel}
          </p>
          <h2 className="text-sm font-semibold text-slate-900">
            {goal ? goal.name : 'Nenhuma meta definida'}
          </h2>
          {goal?.targetDate && (
            <p className="text-[11px] text-slate-500 mt-0.5">Até {formatDate(goal.targetDate)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm"
        >
          {goal ? 'Editar meta' : 'Criar meta'}
        </button>
      </div>

      {goal ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Progresso</span>
            <span className="font-semibold text-slate-900">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Saldo do mês</span>
            <span className="font-medium text-emerald-600">{formatCurrency(saldoDoMes)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Meta</span>
            <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Defina uma meta simples para acompanhar quanto deseja guardar ou investir neste mês.
        </p>
      )}
    </div>
  );
}
