import { useEffect } from 'react';
import { Ban, Check, HandCoins, RotateCcw, X } from 'lucide-react';
import type { Loan } from '../types';
import { ModalShell } from './ModalShell';
import { formatCurrency, formatDate } from '../lib/format';
import {
  formatDiscountPeriod,
  getLoanPaidAmount,
  getOpenAmount,
  isInstallmentLoan,
} from '../lib/loans';

const MODAL_TITLE_ID = 'loan-installments-title';

type Props = {
  open: boolean;
  loan: Loan | null;
  /** Marca/desmarca a parcela como paga (cria/remove a saída do mês dela). */
  onTogglePaid: (loan: Loan, number: number, paid: boolean) => void;
  /** Ajusta o vencimento da parcela; se ela estiver paga, a saída muda de mês junto. */
  onChangeDueDate: (loan: Loan, number: number, dueDate: string) => void;
  /** Cancela/reativa a parcela: cancelada não conta como em aberto. */
  onToggleCancelled: (loan: Loan, number: number, cancelled: boolean) => void;
  /** Abre a quitação antecipada do empréstimo. */
  onSettleLoan: (loan: Loan) => void;
  onClose: () => void;
};

export function LoanInstallmentsModal({
  open,
  loan,
  onTogglePaid,
  onChangeDueDate,
  onToggleCancelled,
  onSettleLoan,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const installments = loan?.installments ?? [];
  const paidCount = installments.filter((i) => i.paid).length;
  const discount = loan ? formatDiscountPeriod(loan) : null;

  const inputClass = 'neu-input rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100';

  return (
    <ModalShell open={open && loan !== null} onClose={onClose} aria-labelledby={MODAL_TITLE_ID}>
      <div className="neu-modal-header">
        <h2
          id={MODAL_TITLE_ID}
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Parcelas do empréstimo
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <div className="neu-modal-body">
        {loan && (
          <>
            <div className="neu-card p-3">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{loan.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatCurrency(loan.amount)} · {paidCount}/{installments.length} parcelas pagas ·{' '}
                {formatCurrency(getLoanPaidAmount(loan))} pago
              </p>
              {discount && (
                <p className="text-xs text-slate-500 dark:text-slate-400">Desconto: {discount}</p>
              )}
              {loan.settlement ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Quitado em {formatDate(loan.settlement.date)} ·{' '}
                  {formatCurrency(loan.settlement.amount)} — parcelas em aberto foram canceladas
                </p>
              ) : (
                getOpenAmount(loan) > 0 && (
                  <button
                    type="button"
                    onClick={() => onSettleLoan(loan)}
                    className="neu-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 mt-2"
                  >
                    <HandCoins size={14} />
                    Quitar empréstimo
                  </button>
                )
              )}
            </div>

            <p className="info-bar">
              Marcar uma parcela como paga registra uma saída em Lançamentos no mês do vencimento
              dela, abatendo o saldo daquele mês.
            </p>

            {isInstallmentLoan(loan) ? (
              <ul className="flex flex-col gap-2">
                {installments.map((installment) => (
                  <li
                    key={installment.number}
                    className={`neu-card p-3 flex items-center justify-between gap-2 ${
                      installment.paid ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {installment.number}/{installments.length} ·{' '}
                        {formatCurrency(installment.amount)}
                      </p>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        Vence
                        <input
                          type="date"
                          value={installment.dueDate}
                          onChange={(e) =>
                            onChangeDueDate(loan, installment.number, e.target.value)
                          }
                          className={inputClass}
                          aria-label={`Vencimento da parcela ${installment.number}`}
                        />
                      </label>
                      {installment.paid && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Pago em {installment.paidDate ? formatDate(installment.paidDate) : '—'}
                        </p>
                      )}
                      {installment.cancelled && <span className="neu-chip">Cancelada</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {installment.cancelled ? (
                        <button
                          type="button"
                          onClick={() => onToggleCancelled(loan, installment.number, false)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 neu-btn-secondary"
                          aria-label={`Reativar parcela ${installment.number}`}
                        >
                          <RotateCcw size={14} />
                          Reativar
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onTogglePaid(loan, installment.number, !installment.paid)
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                              installment.paid ? 'neu-btn-secondary' : 'neu-btn-primary'
                            }`}
                            aria-label={
                              installment.paid
                                ? `Desmarcar pagamento da parcela ${installment.number}`
                                : `Marcar parcela ${installment.number} como paga`
                            }
                          >
                            {installment.paid ? <RotateCcw size={14} /> : <Check size={14} />}
                            {installment.paid ? 'Desfazer' : 'Pagar'}
                          </button>
                          {!installment.paid && (
                            <button
                              type="button"
                              onClick={() => onToggleCancelled(loan, installment.number, true)}
                              className="neu-btn-secondary p-2 rounded-xl"
                              aria-label={`Cancelar parcela ${installment.number}`}
                              title="Cancelar parcela"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Este empréstimo é de pagamento único — edite-o e escolha “Parcelado” para dividir em
                parcelas.
              </p>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
