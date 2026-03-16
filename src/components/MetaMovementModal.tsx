import React, { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const TITLE_ID = 'meta-movement-modal-title';

type MetaMovementModalProps = {
  open: boolean;
  type: 'deposit' | 'withdraw';
  onConfirm: (amount: number, note?: string) => void;
  onClose: () => void;
};

export function MetaMovementModal({ open, type, onConfirm, onClose }: MetaMovementModalProps) {
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);

  useEffect(() => {
    if (!open) {
      setAmount('');
      setNote('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) return;
    onConfirm(value, note.trim() || undefined);
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            tabIndex={-1}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 id={TITLE_ID} className="text-lg font-semibold">
                {label}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                <Plus size={22} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="meta-movement-amount"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
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
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="meta-movement-note"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Observação (opcional)
                </label>
                <input
                  id="meta-movement-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Depósito inicial"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className={`w-full py-3 rounded-2xl font-semibold text-sm shadow-md transition-all active:scale-[0.98] ${
                  type === 'deposit'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
              >
                {type === 'deposit' ? 'Depositar' : 'Sacar'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
