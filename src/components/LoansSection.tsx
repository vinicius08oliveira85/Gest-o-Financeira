import { Plus, Pencil } from 'lucide-react';
import type { Loan, LoanSourceType } from '../types';
import { EmptyState } from './EmptyState';
import { formatCurrency, formatDate, todayLocalISO } from '../lib/format';

const SOURCE_LABELS: Record<LoanSourceType, string> = {
  pessoa_fisica: 'Pessoa física',
  trabalhador: 'Empréstimo do trabalhador',
};

type Props = {
  loans: Loan[];
  onNewLoan: () => void;
  onEditLoan: (loan: Loan) => void;
};

export function LoansSection({ loans, onNewLoan, onEditLoan }: Props) {
  const sumAmount = (list: Loan[]) => list.reduce((sum, l) => sum + l.amount, 0);
  const openLoans = loans.filter((l) => !l.paid);
  const paidLoans = loans.filter((l) => l.paid);
  const totalOpen = sumAmount(openLoans);
  const totalPaid = sumAmount(paidLoans);
  const openBySource = (source: LoanSourceType) =>
    sumAmount(openLoans.filter((l) => l.sourceType === source));

  const sorted = [...loans].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const today = todayLocalISO();
  const isOverdue = (loan: Loan) => !loan.paid && loan.dueDate < today;
  const upcoming = sorted.filter((l) => !l.paid && l.dueDate >= today).slice(0, 3);

  return (
    <div className="section-stack">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Empréstimos</h2>
        {loans.length > 0 && (
          <button type="button" onClick={onNewLoan} className="neu-btn-primary btn-action">
            <Plus size={16} />
            Novo empréstimo
          </button>
        )}
      </div>

      {loans.length === 0 ? (
        <EmptyState variant="cards" onAction={onNewLoan} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="neu-card p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Em aberto
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalOpen)}
              </p>
            </div>
            <div className="neu-card p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Já pago
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(SOURCE_LABELS) as LoanSourceType[]).map((source) => (
              <div key={source} className="neu-card p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {SOURCE_LABELS[source]} · a pagar
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(openBySource(source))}
                </p>
              </div>
            ))}
          </div>

          {upcoming.length > 0 && (
            <div className="neu-card p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Próximos vencimentos
              </p>
              <ul className="flex flex-col gap-1">
                {upcoming.map((loan) => (
                  <li key={loan.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-900 dark:text-slate-100">
                      {formatDate(loan.dueDate)} · {loan.name}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                      {formatCurrency(loan.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {sorted.map((loan) => (
              <li
                key={loan.id}
                className={`neu-card p-4 flex items-center justify-between gap-3 ${
                  isOverdue(loan) ? 'ring-2 ring-red-400 dark:ring-red-500' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {loan.name}
                  </p>
                  {isOverdue(loan) && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Vencido e não pago
                    </span>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {SOURCE_LABELS[loan.sourceType]}
                    {loan.sourceName ? ` · ${loan.sourceName}` : ''} · Pagar em{' '}
                    {formatDate(loan.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(loan.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditLoan(loan)}
                    className="neu-btn-secondary p-2 rounded-xl"
                    aria-label={`Editar ${loan.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
