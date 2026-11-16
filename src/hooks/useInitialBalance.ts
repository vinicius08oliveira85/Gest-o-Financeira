import { useCallback, useState } from 'react';
import { INITIAL_BALANCE_STORAGE_KEY } from '../constants';
import { logError } from '../lib/logger';

/** Lê o saldo inicial gravado neste dispositivo (0 quando nunca foi definido). */
export function readInitialBalance(): number {
  try {
    const raw = localStorage.getItem(INITIAL_BALANCE_STORAGE_KEY);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch (e) {
    logError('Failed to read initial balance', e);
    return 0;
  }
}

/**
 * Saldo inicial (posição do dinheiro antes do primeiro lançamento do app).
 *
 * Fica em localStorage porque o modelo de dados não tem coleção de
 * configurações — criar uma exigiria migração no Appwrite. Por isso o valor é
 * por dispositivo: o modal avisa o usuário. Se o app passar a ter coleção de
 * settings, é este hook que muda.
 */
export function useInitialBalance() {
  const [initialBalance, setInitialBalanceState] = useState<number>(readInitialBalance);

  const setInitialBalance = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
    setInitialBalanceState(safe);
    try {
      localStorage.setItem(INITIAL_BALANCE_STORAGE_KEY, String(safe));
    } catch (e) {
      logError('Failed to save initial balance', e);
    }
  }, []);

  return { initialBalance, setInitialBalance };
}
