import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
            aria-labelledby={TITLE_ID}
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-600"
            tabIndex={-1}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
              <h2
                id={TITLE_ID}
                className="text-xl font-semibold text-slate-900 dark:text-slate-100"
              >
                Aplicar alteração em
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

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Este registro é recorrente. Deseja aplicar as alterações apenas nos próximos meses
                ou em todos os meses (já gerados e futuros)?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleFuture}
                  className="w-full px-4 py-3 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-left"
                >
                  Apenas nos próximos meses
                </button>
                <button
                  type="button"
                  onClick={handleAll}
                  className="w-full px-4 py-3 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors text-left"
                >
                  Em todos os meses (já gerados e futuros)
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
