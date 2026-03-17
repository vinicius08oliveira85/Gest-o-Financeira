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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium shadow-lg transition-opacity duration-200 border border-slate-700 dark:border-slate-600"
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
