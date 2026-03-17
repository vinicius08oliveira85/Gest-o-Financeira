import { useState, useCallback } from 'react';

export type ToastAction = { label: string; callback: () => void };

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [action, setAction] = useState<ToastAction | null>(null);

  const showToast = useCallback((msg: string, toastAction?: ToastAction) => {
    setMessage(msg);
    setAction(toastAction ?? null);
  }, []);

  const dismissToast = useCallback(() => {
    setMessage(null);
    setAction(null);
  }, []);

  return { toastMessage: message, toastAction: action, showToast, dismissToast };
}
