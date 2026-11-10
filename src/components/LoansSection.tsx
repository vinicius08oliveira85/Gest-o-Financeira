import { Plus, Pencil, ListOrdered } from 'lucide-react';
import type { Loan, LoanSourceType } from '../types';
import { EmptyState } from './EmptyState';
import { formatCurrency, formatDate, todayLocalISO } from '../lib/format';
import {
  getLoanPaidAmount,
  getLoanTotals,
  getNextDueDate,
  getOpenInstallments,
  isInstallmentLoan,
} from '../lib/loans';

const SOURCE_LABELS: Record<LoanSourceType, string> = {
  pessoa_fisica: 'Pessoa física',
  trabalhador: 'Empréstimo do trabalhador',
};

/** Quanto ainda falta pagar deste empréstimo (parcelas em aberto ou o valor único). */
function openAmount(loan: Loan): number {
  if (isInstallmentLoan(loan)) {
    return getOpenInstallments(loan).reduce((sum, i) => sum + i.amount, 0);
  }
  return loan.paid ? 0 : loan.amount;
}

type Props = {
  loans: Loan[];
  onNewLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  /** Abre a lista de parcelas (empréstimo parcelado). */
  onOpenInstallments: (loan: Loan) => void;
};

export function LoansSection({ loans, onNewLoan, onEditLoan, onOpenInstallments }: Props) {
  const today = todayLocalISO();
  const totalOpen = getLoanTotals(loans, today).open;
  const totalPaid = loans.reduce((sum, loan) => sum + getLoanPaidAmount(loan), 0);
  const openBySource = (source: LoanSourceType) =>
    loans
      .filter((loan) => loan.sourceType === source)
      .reduce((sum, loan) => sum + openAmount(loan), 0);

  const sorted = [...loans].sort((a, b) => getNextDueDate(a).localeCompare(getNextDueDate(b)));
  const isOverdue = (loan: Loan) => openAmount(loan) > 0 && getNextDueDate(loan) < today;
  const upcoming = sorted
    .filter((l) => openAmount(l) > 0 && getNextDueDate(l) >= today)
    .slice(0, 3);

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
        <EmptyState
          variant="cards"
          title="Nenhum empréstimo cadastrado"
          description="Registre empréstimos para acompanhar o valor em aberto e o que já foi pago."
          actionLabel="Novo empréstimo"
          onAction={onNewLoan}
        />
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
                      {formatDate(getNextDueDate(loan))} · {loan.name}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                      {formatCurrency(openAmount(loan))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {sorted.map((loan) => {
              const paidCount = loan.installments?.filter((i) => i.paid).length ?? 0;
              const count = loan.installments?.length ?? 1;
              return (
                <li
                  key={loan.id}
                  className={`neu-card p-4 flex items-start justify-between gap-3 ${
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
                      {loan.sourceName ? ` · ${loan.sourceName}` : ''} ·{' '}
                      {isInstallmentLoan(loan)
                        ? `${paidCount}/${count} parcelas pagas`
                        : `Pagar em ${formatDate(loan.dueDate)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(isInstallmentLoan(loan) ? openAmount(loan) : loan.amount)}
                    </span>
                    <div className="flex items-center gap-2">
                      {isInstallmentLoan(loan) && (
                        <button
                          type="button"
                          onClick={() => onOpenInstallments(loan)}
                          className="neu-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                          aria-label={`Ver parcelas de ${loan.name}`}
                        >
                          <ListOrdered size={14} />
                          Ver parcelas
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditLoan(loan)}
                        className="neu-btn-secondary p-2 rounded-xl"
                        aria-label={`Editar ${loan.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
