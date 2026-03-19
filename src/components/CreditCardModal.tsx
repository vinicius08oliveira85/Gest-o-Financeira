import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CreditCard } from '../types';

const MODAL_TITLE_ID = 'credit-card-modal-title';

const PRESET_COLORS = [
  '#1e293b', // slate-800
  '#0f766e', // teal-700
  '#1d4ed8', // blue-700
  '#7c3aed', // violet-700
  '#be185d', // pink-700
  '#b45309', // amber-700
  '#15803d', // green-700
  '#dc2626', // red-600
];

type Props = {
  open: boolean;
  card: CreditCard | null;
  onSave: (card: Omit<CreditCard, 'id'> & { id?: string }) => void;
  onRequestDelete?: (card: CreditCard) => void;
  onClose: () => void;
};

export function CreditCardModal({ open, card, onSave, onRequestDelete, onClose }: Props) {
  const [name, setName] = React.useState('');
  const [limitAmount, setLimitAmount] = React.useState('');
  const [closingDay, setClosingDay] = React.useState('25');
  const [dueDay, setDueDay] = React.useState('5');
  const [color, setColor] = React.useState(PRESET_COLORS[0]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  useEffect(() => {
    setName(card?.name ?? '');
    setLimitAmount(card ? card.limitAmount.toString() : '');
    setClosingDay(card ? card.closingDay.toString() : '25');
    setDueDay(card ? card.dueDay.toString() : '5');
    setColor(card?.color ?? PRESET_COLORS[0]);
    setErrors({});
  }, [card, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome obrigatório';
    const limit = parseFloat(limitAmount);
    if (!limitAmount || Number.isNaN(limit) || limit <= 0)
      errs.limitAmount = 'Informe um limite válido';
    const cd = parseInt(closingDay, 10);
    if (!closingDay || Number.isNaN(cd) || cd < 1 || cd > 31) errs.closingDay = 'Dia de 1 a 31';
    const dd = parseInt(dueDay, 10);
    if (!dueDay || Number.isNaN(dd) || dd < 1 || dd > 31) errs.dueDay = 'Dia de 1 a 31';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSave({
      id: card?.id,
      name: name.trim(),
      limitAmount: parseFloat(limitAmount),
      closingDay: parseInt(closingDay, 10),
      dueDay: parseInt(dueDay, 10),
      color,
      createdAt: card?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  }

  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all';
  const labelClass =
    'block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5';
  const errorClass = 'mt-1 text-xs text-red-500 dark:text-red-400';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={MODAL_TITLE_ID}
            className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-600"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2
                id={MODAL_TITLE_ID}
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                {card ? 'Editar cartão' : 'Novo cartão'}
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
                <label htmlFor="cc-name" className={labelClass}>
                  Nome do cartão
                </label>
                <input
                  id="cc-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank, Inter, C6"
                  className={inputClass + (errors.name ? ' border-red-400' : '')}
                />
                {errors.name && <p className={errorClass}>{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="cc-limit" className={labelClass}>
                  Limite (R$)
                </label>
                <input
                  id="cc-limit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="5000,00"
                  inputMode="decimal"
                  className={inputClass + (errors.limitAmount ? ' border-red-400' : '')}
                />
                {errors.limitAmount && <p className={errorClass}>{errors.limitAmount}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cc-closing" className={labelClass}>
                    Fechamento (dia)
                  </label>
                  <input
                    id="cc-closing"
                    type="number"
                    min="1"
                    max="31"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    className={inputClass + (errors.closingDay ? ' border-red-400' : '')}
                  />
                  {errors.closingDay && <p className={errorClass}>{errors.closingDay}</p>}
                </div>
                <div>
                  <label htmlFor="cc-due" className={labelClass}>
                    Vencimento (dia)
                  </label>
                  <input
                    id="cc-due"
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className={inputClass + (errors.dueDay ? ' border-red-400' : '')}
                  />
                  {errors.dueDay && <p className={errorClass}>{errors.dueDay}</p>}
                </div>
              </div>

              <div>
                <span className={labelClass}>Cor</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full transition-all ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                      }`}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm shadow-md hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all active:scale-[0.98]"
                >
                  Salvar cartão
                </button>
                {card && onRequestDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onRequestDelete(card);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-2xl font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-all"
                  >
                    Excluir cartão
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
