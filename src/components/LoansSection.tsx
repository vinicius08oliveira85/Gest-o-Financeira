import { Plus, Pencil, ListOrdered, BellRing, HandCoins, Undo2 } from 'lucide-react';
import type { Loan, LoanSourceType } from '../types';
import { EmptyState } from './EmptyState';
import { formatCurrency, formatDate, todayLocalISO } from '../lib/format';
import {
  formatDiscountPeriod,
  formatMonthLabel,
  getEndingDiscounts,
  getLoanInterest,
  getLoanPaidAmount,
  getLoanPayableAmount,
  getLoanTotals,
  getNextDueDate,
  getNextOpenItem,
  getOpenAmount,
  isInstallmentLoan,
  monthKey,
} from '../lib/loans';

const SOURCE_LABELS: Record<LoanSourceType, string> = {
  pessoa_fisica: 'Pessoa física',
  trabalhador: 'Empréstimo do trabalhador',
};

type Props = {
  loans: Loan[];
  onNewLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  /** Abre a lista de parcelas (empréstimo parcelado). */
  onOpenInstallments: (loan: Loan) => void;
  /** Abre a quitação antecipada (paga o saldo de uma vez). */
  onSettleLoan: (loan: Loan) => void;
  /** Desfaz uma quitação, devolvendo as parcelas canceladas. */
  onUndoSettlement: (loan: Loan) => void;
};

export function LoansSection({
  loans,
  onNewLoan,
  onEditLoan,
  onOpenInstallments,
  onSettleLoan,
  onUndoSettlement,
}: Props) {
  const today = todayLocalISO();
  const totalOpen = getLoanTotals(loans, today).open;
  const endingDiscounts = getEndingDiscounts(loans, today, 2);
  const totalPaid = loans.reduce((sum, loan) => sum + getLoanPaidAmount(loan), 0);
  const openBySource = (source: LoanSourceType) =>
    loans
      .filter((loan) => loan.sourceType === source)
      .reduce((sum, loan) => sum + getOpenAmount(loan), 0);

  const sorted = [...loans].sort((a, b) => getNextDueDate(a).localeCompare(getNextDueDate(b)));
  const isOverdue = (loan: Loan) => getOpenAmount(loan) > 0 && getNextDueDate(loan) < today;
  const upcoming = sorted
    .filter((l) => getOpenAmount(l) > 0 && getNextDueDate(l) >= today)
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

          {endingDiscounts.length > 0 && (
            <div className="neu-card p-4 ring-1 ring-amber-300/70 dark:ring-amber-500/40">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <BellRing size={14} />
                Desconto terminando
              </p>
              <ul className="flex flex-col gap-1">
                {endingDiscounts.slice(0, 3).map(({ loan, end }) => (
                  <li key={loan.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-900 dark:text-slate-100">
                      {loan.name} ·{' '}
                      {end === monthKey(today)
                        ? 'último desconto agora'
                        : `termina em ${formatMonthLabel(end)}`}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                      {formatCurrency(getOpenAmount(loan))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="neu-card p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Próximos vencimentos
              </p>
              <ul className="flex flex-col gap-1">
                {upcoming.map((loan) => {
                  // Valor do próximo vencimento (a parcela), não o saldo do empréstimo
                  // inteiro — senão um 12x de R$ 100 aparecia como R$ 1.200 no dia 10.
                  const next = getNextOpenItem(loan);
                  if (!next) return null;
                  return (
                    <li key={loan.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-900 dark:text-slate-100">
                        {formatDate(next.dueDate)} · {loan.name}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(next.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-2xs text-slate-500 dark:text-slate-400">
                Valor do próximo vencimento de cada empréstimo (parcela ou pagamento único).
              </p>
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {sorted.map((loan) => {
              const paidCount = loan.installments?.filter((i) => i.paid).length ?? 0;
              const count = loan.installments?.length ?? 1;
              const open = getOpenAmount(loan);
              const discount = formatDiscountPeriod(loan);
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
                      {loan.settlement
                        ? `Quitado · ${paidCount}/${count} parcelas pagas`
                        : isInstallmentLoan(loan)
                          ? `${paidCount}/${count} parcelas pagas`
                          : `Pagar em ${formatDate(loan.dueDate)}`}
                    </p>
                    {getLoanInterest(loan) > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total com juros: {formatCurrency(getLoanPayableAmount(loan))} · juros de{' '}
                        {formatCurrency(getLoanInterest(loan))}
                      </p>
                    )}
                    {discount && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Desconto: {discount}
                      </p>
                    )}
                    {loan.settlement && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        Quitado em {formatDate(loan.settlement.date)} ·{' '}
                        {formatCurrency(loan.settlement.amount)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-semibold text-right text-slate-900 dark:text-slate-100">
                      {formatCurrency(open > 0 ? open : loan.amount)}
                      <span className="block text-2xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {open > 0 ? 'a pagar' : loan.settlement ? 'quitado' : 'pago'}
                      </span>
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {open > 0 && (
                        <button
                          type="button"
                          onClick={() => onSettleLoan(loan)}
                          className="neu-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                          aria-label={`Quitar ${loan.name}`}
                        >
                          <HandCoins size={14} />
                          Quitar
                        </button>
                      )}
                      {loan.settlement && (
                        <button
                          type="button"
                          onClick={() => onUndoSettlement(loan)}
                          className="neu-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                          aria-label={`Desfazer quitação de ${loan.name}`}
                        >
                          <Undo2 size={14} />
                          Desfazer
                        </button>
                      )}
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
