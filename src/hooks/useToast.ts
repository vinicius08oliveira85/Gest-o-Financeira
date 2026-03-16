import { useState, useCallback } from 'react';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
  }, []);

  const dismissToast = useCallback(() => setMessage(null), []);

  return { toastMessage: message, showToast, dismissToast };
}
