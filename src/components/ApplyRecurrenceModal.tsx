import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ModalShell } from './ModalShell';

const TITLE_ID = 'apply-recurrence-modal-title';

type ApplyRecurrenceModalProps = {
  open: boolean;
  onApplyFuture: () => void;
  onApplyAll: () => void;
  onClose: () => void;
};

export function ApplyRecurrenceModal({
  open,
  onApplyFuture,
  onApplyAll,
  onClose,
}: ApplyRecurrenceModalProps) {
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

  const handleFuture = () => {
    onApplyFuture();
    onClose();
  };

  const handleAll = () => {
    onApplyAll();
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
          Aplicar alteração em
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={24} />
        </button>
      </div>

      <div className="neu-modal-body">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Este registro é recorrente. Deseja aplicar as alterações apenas nos próximos meses ou em
          todos os meses (já gerados e futuros)?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleFuture}
            className="w-full neu-btn px-4 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-200 text-left"
          >
            Apenas nos próximos meses
          </button>
          <button
            type="button"
            onClick={handleAll}
            className="w-full neu-btn-primary px-4 py-3 rounded-xl font-medium text-left"
          >
            Em todos os meses (já gerados e futuros)
          </button>
        </div>
        <button type="button" onClick={onClose} className="neu-btn-link">
          Cancelar
        </button>
      </div>
    </ModalShell>
  );
}
