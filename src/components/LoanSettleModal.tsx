import { useEffect, useState } from 'react';
import { HandCoins, X } from './icons';
import type { Loan } from '../types';
import { ModalShell } from './ModalShell';
import { formatCurrency, todayLocalISO } from '../lib/format';
import {
  formatCurrencyForInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from '../lib/currencyInput';
import { getInstallmentsToCancel, getOpenAmount, isInstallmentLoan } from '../lib/loans';

const MODAL_TITLE_ID = 'loan-settle-title';

type Props = {
  open: boolean;
  loan: Loan | null;
  /** Quita o empréstimo com o valor pago à vista e a data do pagamento. */
  onSettle: (loan: Loan, amount: number, date: string) => void;
  onClose: () => void;
};

export function LoanSettleModal({ open, loan, onSettle, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const openAmount = loan ? getOpenAmount(loan) : 0;
  const cancelCount = loan ? getInstallmentsToCancel(loan).length : 0;

  useEffect(() => {
    if (!open || !loan) return;
    // Sugere o saldo em aberto, mas deixa ajustar (quitação negociada com desconto).
    setAmount(formatCurrencyForInput(getOpenAmount(loan)));
    setDate(todayLocalISO());
    setError(null);
  }, [open, loan]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loan) return;
    const value = parseCurrencyInput(amount);
    if (value === null || value <= 0) {
      setError('Informe um valor válido');
      return;
    }
    if (!date) {
      setError('Informe a data do pagamento');
      return;
    }
    onSettle(loan, value, date);
    onClose();
  }

  const inputClass =
    'neu-input rounded-lg px-3 py-2 text-sm w-full text-slate-900 dark:text-slate-100';

  return (
    <ModalShell open={open && loan !== null} onClose={onClose} aria-labelledby={MODAL_TITLE_ID}>
      <div className="neu-modal-header">
        <h2
          id={MODAL_TITLE_ID}
          className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"
        >
          <HandCoins size={18} />
          Quitar empréstimo
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="neu-modal-body">
        {loan && (
          <>
            <div className="neu-card p-3">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{loan.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Saldo em aberto: {formatCurrency(openAmount)}
              </p>
            </div>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              Valor pago à vista
              <input
                id="loan-settle-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(maskCurrencyInput(e.target.value));
                  setError(null);
                }}
                className={inputClass}
                placeholder="0,00"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              Data do pagamento
              <input
                id="loan-settle-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setError(null);
                }}
                className={inputClass}
              />
            </label>

            <p className="info-bar">
              A quitação lança uma saída única em Lançamentos na data acima (abatendo o mês) e
              cancela{' '}
              {isInstallmentLoan(loan)
                ? `as ${cancelCount} parcela(s) ainda em aberto`
                : 'a cobrança pendente'}{' '}
              — o empréstimo fica sem saldo no Resumo e nos Relatórios. Parcelas já pagas continuam
              como estão.
            </p>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="neu-btn-secondary btn-action">
                Cancelar
              </button>
              <button type="submit" className="neu-btn-primary btn-action">
                <HandCoins size={16} />
                Quitar empréstimo
              </button>
            </div>
          </>
        )}
      </form>
    </ModalShell>
  );
}
