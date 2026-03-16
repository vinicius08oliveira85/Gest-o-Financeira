import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            tabIndex={-1}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 id={TITLE_ID} className="text-xl font-semibold">
                Excluir registro recorrente
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Deseja excluir apenas este registro ou este e todas as repetições futuras?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleThisOnly}
                  className="w-full px-4 py-3 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-left"
                >
                  Apenas este
                </button>
                <button
                  type="button"
                  onClick={handleThisAndCopies}
                  className="w-full px-4 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors text-left"
                >
                  Este e todas as repetições
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
