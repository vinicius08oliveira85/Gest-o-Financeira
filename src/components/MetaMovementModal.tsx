import React, { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const TITLE_ID = 'meta-movement-modal-title';

type MetaMovementModalProps = {
  open: boolean;
  type: 'deposit' | 'withdraw';
  isLoading?: boolean;
  onConfirm: (amount: number, note?: string) => void | Promise<void>;
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
  const [note, setNote] = React.useState('');
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);

  useEffect(() => {
    if (!open) {
      setAmount('');
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
    const value = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) {
      setAmountError('Informe um valor maior que zero.');
      return;
    }
    await Promise.resolve(onConfirm(value, note.trim() || undefined));
    onClose();
  };

  const label = type === 'deposit' ? 'Depositar na meta' : 'Sacar da meta';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-600"
            tabIndex={-1}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
              <h2
                id={TITLE_ID}
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                {label}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="meta-movement-amount"
                  className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Valor (R$)
                </label>
                <input
                  id="meta-movement-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (amountError) setAmountError(null);
                  }}
                  placeholder="0,00"
                  className={`w-full bg-slate-50 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                    amountError
                      ? 'border-2 border-red-500 dark:border-red-400 focus:ring-red-500/20 focus:border-red-500'
                      : 'border border-slate-200 dark:border-slate-600 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500'
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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-2xl font-semibold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2 ${
                  type === 'deposit'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'
                }`}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {type === 'deposit' ? 'Depositar' : 'Sacar'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
