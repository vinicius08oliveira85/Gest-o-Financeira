import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CardExpense, CreditCard } from '../types';
import { getBillingPeriod } from '../lib/cardInvoice';

const MODAL_TITLE_ID = 'card-expense-modal-title';

type Props = {
  open: boolean;
  card: CreditCard;
  expense: CardExpense | null;
  onSave: (expense: Omit<CardExpense, 'id' | 'createdAt'>) => void;
  onClose: () => void;
};

export function CardExpenseModal({ open, card, expense, onSave, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(today);
  const [category, setCategory] = React.useState('');
  const [tag, setTag] = React.useState('');
  const [installments, setInstallments] = React.useState('1');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const billing = React.useMemo(() => {
    if (!date) return null;
    try {
      return getBillingPeriod(date, card.closingDay);
    } catch {
      return null;
    }
  }, [date, card.closingDay]);

  useEffect(() => {
    setName(expense?.name ?? '');
    setAmount(expense ? expense.amount.toString() : '');
    setDate(expense?.date ?? today);
    setCategory(expense?.category ?? '');
    setTag(expense?.tag ?? '');
    setInstallments(expense?.installmentsCount ? expense.installmentsCount.toString() : '1');
    setErrors({});
  }, [expense, open, today]);

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
    if (!name.trim()) errs.name = 'Descrição obrigatória';
    const v = parseFloat(amount);
    if (!amount || Number.isNaN(v) || v <= 0) errs.amount = 'Informe um valor válido';
    if (!date) errs.date = 'Data obrigatória';
    const inst = parseInt(installments, 10);
    if (Number.isNaN(inst) || inst < 1) errs.installments = 'Mínimo 1 parcela';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!billing) return;

    const inst = parseInt(installments, 10);
    const totalAmount = parseFloat(amount);
    const installmentAmount = inst > 1 ? totalAmount / inst : totalAmount;
    const parentId = inst > 1 ? crypto.randomUUID() : undefined;

    const base: Omit<CardExpense, 'id' | 'createdAt'> = {
      cardId: card.id,
      name: name.trim(),
      amount: installmentAmount,
      date,
      billingMonth: billing.month,
      billingYear: billing.year,
      category: category.trim() || undefined,
      tag: tag.trim() || undefined,
      installmentsCount: inst > 1 ? inst : undefined,
      installmentNumber: inst > 1 ? 1 : undefined,
      parentInstallmentId: parentId,
    };

    onSave(base);

    // Gerar parcelas adicionais
    if (inst > 1) {
      for (let i = 2; i <= inst; i++) {
        const futureDate = new Date(date);
        futureDate.setMonth(futureDate.getMonth() + (i - 1));
        const futureIso = futureDate.toISOString().slice(0, 10);
        const futureBilling = getBillingPeriod(futureIso, card.closingDay);
        onSave({
          ...base,
          date: futureIso,
          billingMonth: futureBilling.month,
          billingYear: futureBilling.year,
          installmentNumber: i,
          parentInstallmentId: parentId,
        });
      }
    }

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
            className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-600 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2
                  id={MODAL_TITLE_ID}
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                >
                  {expense ? 'Editar gasto' : 'Novo gasto'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{card.name}</p>
              </div>
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
                <label htmlFor="ce-name" className={labelClass}>
                  Descrição
                </label>
                <input
                  id="ce-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mercado, Gasolina"
                  className={inputClass + (errors.name ? ' border-red-400' : '')}
                />
                {errors.name && <p className={errorClass}>{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="ce-amount" className={labelClass}>
                  Valor total (R$)
                </label>
                <input
                  id="ce-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className={inputClass + (errors.amount ? ' border-red-400' : '')}
                />
                {errors.amount && <p className={errorClass}>{errors.amount}</p>}
              </div>

              <div>
                <label htmlFor="ce-date" className={labelClass}>
                  Data da compra
                </label>
                <input
                  id="ce-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass + (errors.date ? ' border-red-400' : '')}
                />
                {errors.date && <p className={errorClass}>{errors.date}</p>}
              </div>

              {billing && (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  Fatura:{' '}
                  <strong>
                    {new Date(billing.year, billing.month).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                  {parseInt(installments, 10) > 1 && ` — parcela 1/${installments}`}
                </p>
              )}

              <div>
                <label htmlFor="ce-installments" className={labelClass}>
                  Parcelas
                </label>
                <input
                  id="ce-installments"
                  type="number"
                  min="1"
                  max="48"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className={inputClass + (errors.installments ? ' border-red-400' : '')}
                />
                {errors.installments && <p className={errorClass}>{errors.installments}</p>}
                {parseInt(installments, 10) > 1 && parseFloat(amount) > 0 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {parseInt(installments, 10)}x de R${' '}
                    {(parseFloat(amount) / parseInt(installments, 10)).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ce-category" className={labelClass}>
                    Categoria
                  </label>
                  <input
                    id="ce-category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ce-tag" className={labelClass}>
                    Tag
                  </label>
                  <input
                    id="ce-tag"
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm shadow-md hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all active:scale-[0.98]"
              >
                Salvar gasto
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
