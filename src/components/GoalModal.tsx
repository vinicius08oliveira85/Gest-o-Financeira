import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Goal } from '../types';
import { DateInput } from './DateInput';
import { ModalShell } from './ModalShell';

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
      category: goal?.category,
      targetDate: targetDate || undefined,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  }

  return (
    <ModalShell open={open} onClose={onClose} aria-labelledby={GOAL_MODAL_TITLE_ID}>
      <div className="neu-modal-header">
        <h2
          id={GOAL_MODAL_TITLE_ID}
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          {goal ? 'Editar meta' : 'Nova meta'}
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="neu-modal-body">
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
            className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all"
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
            className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all"
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
            className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all"
          />
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Os depósitos acumulam ao longo dos meses até atingir o valor alvo.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            className="w-full neu-btn-primary py-3 rounded-2xl font-semibold text-sm active:scale-[0.98]"
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
              className="w-full neu-btn-danger-soft py-2.5 rounded-2xl font-medium text-sm"
            >
              Excluir meta
            </button>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
