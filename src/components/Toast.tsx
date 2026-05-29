import { useEffect } from 'react';

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

  if (!message) return null;

  const handleAction = () => {
    action?.callback();
    onDismiss();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="neu-toast fixed bottom-[var(--fab-offset)] left-1/2 -translate-x-1/2 z-[100] flex items-center gap-[var(--inline-gap)] px-[var(--card-p)] py-[var(--inline-gap)] rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium transition-opacity duration-200 max-w-[min(100%,24rem)]"
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
    </div>
  );
}
