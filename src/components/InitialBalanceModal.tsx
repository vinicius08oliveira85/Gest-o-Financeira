import { useEffect, useRef, useState } from 'react';
import { X } from './icons';
import { ModalShell } from './ModalShell';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  formatCurrencyForInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from '../lib/currencyInput';

const MODAL_TITLE_ID = 'initial-balance-title';

type Props = {
  open: boolean;
  initialBalance: number;
  onSave: (value: number) => void;
  onClose: () => void;
};

/**
 * Saldo inicial: a posição do dinheiro antes do primeiro lançamento do app.
 * Sem ele, o "Acumulado" é só a soma dos lançamentos e não o dinheiro real.
 */
export function InitialBalanceModal({ open, initialBalance, onSave, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);

  // Mesmo comportamento dos outros modais: Escape fecha sem salvar.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setAmount(initialBalance ? formatCurrencyForInput(initialBalance) : '');
    setError(null);
  }, [open, initialBalance]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount.trim() === '') {
      onSave(0);
      onClose();
      return;
    }
    const value = parseCurrencyInput(amount);
    if (value === null) {
      setError('Informe um valor válido');
      return;
    }
    onSave(value);
    onClose();
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      contentRef={contentRef}
      aria-labelledby={MODAL_TITLE_ID}
    >
      <div className="neu-modal-header">
        <div>
          <h2
            id={MODAL_TITLE_ID}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Saldo inicial
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Quanto você tinha antes do primeiro lançamento
          </p>
        </div>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="neu-modal-body">
        <div>
          <label
            htmlFor="initial-balance-amount"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5"
          >
            Valor
          </label>
          <input
            id="initial-balance-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(maskCurrencyInput(e.target.value));
              setError(null);
            }}
            placeholder="R$ 0,00"
            autoFocus
            className={
              'w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all' +
              (error ? ' border-red-400' : '')
            }
          />
          {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Pode ser negativo (dívida). Somado aos lançamentos finalizados, este valor forma o saldo
          atual. Fica guardado neste dispositivo.
        </p>

        <button
          type="submit"
          className="w-full neu-btn-primary py-3 rounded-2xl font-semibold text-sm active:scale-[0.98]"
        >
          Salvar saldo inicial
        </button>
      </form>
    </ModalShell>
  );
}
