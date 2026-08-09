import React, { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { DateInput } from './DateInput';
import { todayLocalISO } from '../lib/format';
import { maskCurrencyInput, parseCurrencyInput } from '../lib/currencyInput';
import { ModalShell } from './ModalShell';

const TITLE_ID = 'meta-movement-modal-title';

type MetaMovementModalProps = {
  open: boolean;
  type: 'deposit' | 'withdraw';
  isLoading?: boolean;
  onConfirm: (amount: number, date: string, isPaid: boolean, note?: string) => void | Promise<void>;
  onClose: () => void;
};

export function MetaMovementModal({
  open,
  type,
  isLoading = false,
  onConfirm,
  onClose,
}: MetaMovementModalProps) {
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(todayLocalISO());
  const [isPaid, setIsPaid] = React.useState(true);
  const [note, setNote] = React.useState('');
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);

  useEffect(() => {
    if (!open) {
      setAmount('');
      setDate(todayLocalISO());
      setIsPaid(true);
      setNote('');
      setAmountError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError(null);
    const value = parseCurrencyInput(amount);
    if (value === null || value <= 0) {
      setAmountError('Informe um valor maior que zero.');
      return;
    }
    await Promise.resolve(
      onConfirm(value, date || todayLocalISO(), isPaid, note.trim() || undefined)
    );
    onClose();
  };

  const label = type === 'deposit' ? 'Depositar na meta' : 'Sacar da meta';

  const inputBase =
    'w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all';

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      contentRef={contentRef}
      rootClassName="z-[55]"
      aria-labelledby={TITLE_ID}
    >
      <div className="neu-modal-header">
        <h2 id={TITLE_ID} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {label}
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="neu-modal-body">
        {/* Valor */}
        <div>
          <label
            htmlFor="meta-movement-amount"
            className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Valor (R$)
          </label>
          <input
            id="meta-movement-amount"
            type="text"
            required
            value={amount}
            onChange={(e) => {
              setAmount(maskCurrencyInput(e.target.value));
              if (amountError) setAmountError(null);
            }}
            placeholder="0,00"
            inputMode="decimal"
            className={`w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all ${
              amountError ? 'ring-2 ring-red-500' : ''
            }`}
            aria-invalid={!!amountError}
            aria-describedby={amountError ? 'meta-movement-amount-error' : undefined}
          />
          {amountError && (
            <p
              id="meta-movement-amount-error"
              className="mt-1.5 text-sm text-red-600 dark:text-red-400"
            >
              {amountError}
            </p>
          )}
        </div>

        {/* Data programada */}
        <div>
          <label
            htmlFor="meta-movement-date"
            className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Data programada
          </label>
          <DateInput
            id="meta-movement-date"
            value={date}
            onChange={setDate}
            className={inputBase}
          />
        </div>

        {/* Finalizar agora */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            className={`neu-toggle-track ${isPaid ? 'neu-toggle-track-on' : ''}`}
            onClick={() => setIsPaid((v) => !v)}
          >
            <span className={`neu-toggle-thumb ${isPaid ? 'left-5' : 'left-1'}`} />
          </div>
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
            className="sr-only"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {isPaid ? 'Finalizar agora' : 'Programado (pendente)'}
          </span>
        </label>

        {/* Observação */}
        <div>
          <label
            htmlFor="meta-movement-note"
            className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Observação (opcional)
          </label>
          <input
            id="meta-movement-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Depósito inicial"
            className={inputBase}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2 ${
            type === 'deposit' ? 'neu-btn-success' : 'neu-btn'
          }`}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
          {isPaid
            ? type === 'deposit'
              ? 'Depositar agora'
              : 'Sacar agora'
            : type === 'deposit'
              ? 'Programar depósito'
              : 'Programar saque'}
        </button>
      </form>
    </ModalShell>
  );
}
