import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ModalShell } from './ModalShell';

const TITLE_ID = 'delete-recurring-modal-title';

type DeleteRecurringModalProps = {
  open: boolean;
  onDeleteThisOnly: () => void;
  onDeleteThisAndCopies: () => void;
  onClose: () => void;
};

export function DeleteRecurringModal({
  open,
  onDeleteThisOnly,
  onDeleteThisAndCopies,
  onClose,
}: DeleteRecurringModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleThisOnly = () => {
    onDeleteThisOnly();
    onClose();
  };

  const handleThisAndCopies = () => {
    onDeleteThisAndCopies();
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      contentRef={contentRef}
      size="md"
      rootClassName="z-[60]"
      aria-labelledby={TITLE_ID}
    >
      <div className="neu-modal-header">
        <h2 id={TITLE_ID} className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Excluir registro recorrente
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={24} />
        </button>
      </div>

      <div className="neu-modal-body">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Deseja excluir apenas este registro ou este e todas as repetições futuras?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleThisOnly}
            className="w-full neu-btn px-4 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-200 text-left"
          >
            Apenas este
          </button>
          <button
            type="button"
            onClick={handleThisAndCopies}
            className="neu-btn-danger w-full px-4 py-3 rounded-xl font-medium text-left"
          >
            Este e todas as repetições
          </button>
        </div>
        <button type="button" onClick={onClose} className="neu-btn-link">
          Cancelar
        </button>
      </div>
    </ModalShell>
  );
}
