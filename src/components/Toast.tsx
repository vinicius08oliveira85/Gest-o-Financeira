import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type ToastProps = {
  message: string | null;
  action: { label: string; callback: () => void } | null;
  onDismiss: () => void;
  durationMs?: number;
};

export function Toast({ message, action, onDismiss, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [message, onDismiss, durationMs]);

  const handleAction = () => {
    action?.callback();
    onDismiss();
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="neu-toast fixed bottom-[var(--fab-offset)] left-0 right-0 mx-auto w-fit max-w-[min(100%,24rem)] z-[100] flex items-center gap-[var(--inline-gap)] px-[var(--card-p)] py-[var(--inline-gap)] rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium"
        >
          <span>{message}</span>
          {action && (
            <button
              type="button"
              onClick={handleAction}
              className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              {action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
