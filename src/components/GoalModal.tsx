import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Goal } from '../types';
import { DateInput } from './DateInput';

const GOAL_MODAL_TITLE_ID = 'goal-modal-title';

type GoalModalProps = {
  open: boolean;
  goal: Goal | null;
  onSave: (partial: Omit<Goal, 'id' | 'currentAmount'> & { id?: string }) => void;
  /** Chamado quando o usuário clica em Excluir; o pai deve mostrar confirmação e depois excluir */
  onRequestDelete?: (goal: Goal) => void;
  onClose: () => void;
};

export function GoalModal({ open, goal, onSave, onRequestDelete, onClose }: GoalModalProps) {
  const [name, setName] = React.useState(goal?.name ?? '');
  const [target, setTarget] = React.useState(goal ? goal.targetAmount.toString() : '');
  const [targetDate, setTargetDate] = React.useState(goal?.targetDate ?? '');

  React.useEffect(() => {
    setName(goal?.name ?? '');
    setTarget(goal ? goal.targetAmount.toString() : '');
    setTargetDate(goal?.targetDate ?? '');
  }, [goal, open]);

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
    if (!name || !target) return;
    const targetAmount = parseFloat(target);
    if (Number.isNaN(targetAmount) || targetAmount <= 0) return;

    onSave({
      id: goal?.id,
      name,
      targetAmount,
      currentAmount: goal?.currentAmount ?? 0,
      category: goal?.category,
      targetDate: targetDate || undefined,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  }

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
            aria-labelledby={GOAL_MODAL_TITLE_ID}
            className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-600"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
              <h2
                id={GOAL_MODAL_TITLE_ID}
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                {goal ? 'Editar meta' : 'Nova meta'}
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
                  htmlFor="goal-modal-name"
                  className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Nome da meta
                </label>
                <input
                  id="goal-modal-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Guardar para reserva de emergência"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-modal-target"
                  className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Valor alvo (R$)
                </label>
                <input
                  id="goal-modal-target"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-modal-target-date"
                  className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Atingir até (data, opcional)
                </label>
                <DateInput
                  id="goal-modal-target-date"
                  value={targetDate}
                  onChange={setTargetDate}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all"
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Os depósitos acumulam ao longo dos meses até atingir o valor alvo.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm shadow-md hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all active:scale-[0.98]"
                >
                  Salvar meta
                </button>
                {goal && onRequestDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onRequestDelete(goal);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-2xl font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-all"
                  >
                    Excluir meta
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
