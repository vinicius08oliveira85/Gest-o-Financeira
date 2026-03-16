import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={CONFIRM_DELETE_TITLE_ID}
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-600"
            tabIndex={-1}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
              <h2
                id={CONFIRM_DELETE_TITLE_ID}
                className="text-xl font-semibold text-slate-900 dark:text-slate-100"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Fechar"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-slate-600 dark:text-slate-300">{message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 transition-colors"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
