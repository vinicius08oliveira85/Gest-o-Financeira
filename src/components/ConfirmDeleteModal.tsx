import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ModalShell } from './ModalShell';

const CONFIRM_DELETE_TITLE_ID = 'confirm-delete-modal-title';

type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDeleteModal({
  open,
  title = 'Confirmar exclusão',
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      contentRef={contentRef}
      size="md"
      aria-labelledby={CONFIRM_DELETE_TITLE_ID}
    >
      <div className="neu-modal-header">
        <h2
          id={CONFIRM_DELETE_TITLE_ID}
          className="text-xl font-semibold text-slate-900 dark:text-slate-100"
        >
          {title}
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={24} />
        </button>
      </div>

      <div className="neu-modal-body space-y-6">
        <p className="text-slate-600 dark:text-slate-300">{message}</p>
        <div className="neu-modal-footer !p-0">
          <button
            type="button"
            onClick={onClose}
            className="neu-btn px-4 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="neu-btn-danger px-4 py-2.5 rounded-xl font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
