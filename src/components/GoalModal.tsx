import React from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Goal } from '../types';

type GoalModalProps = {
  open: boolean;
  goal: Goal | null;
  month: number;
  year: number;
  onSave: (partial: Omit<Goal, 'id' | 'currentAmount'> & { id?: string }) => void;
  onClose: () => void;
};

export function GoalModal({
  open,
  goal,
  month,
  year,
  onSave,
  onClose,
}: GoalModalProps) {
  const [name, setName] = React.useState(goal?.name ?? '');
  const [target, setTarget] = React.useState(
    goal ? goal.targetAmount.toString() : ''
  );

  React.useEffect(() => {
    setName(goal?.name ?? '');
    setTarget(goal ? goal.targetAmount.toString() : '');
  }, [goal, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !target) return;
    const targetAmount = parseFloat(target);
    if (Number.isNaN(targetAmount) || targetAmount <= 0) return;

    onSave({
      id: goal?.id,
      name,
      targetAmount,
      category: goal?.category,
      month,
      year,
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {goal ? 'Editar meta' : 'Nova meta'}
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
              >
                <Plus size={22} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nome da meta
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Guardar para reserva"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Valor alvo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Acompanhe esta meta apenas para o mês de{' '}
                {new Date(year, month).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
                .
              </p>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-semibold text-sm shadow-md hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Salvar meta
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

