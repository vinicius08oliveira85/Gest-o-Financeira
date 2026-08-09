import { useEffect, useState, useCallback, useMemo } from 'react';
import type { CardExpense } from '../types';
import { CARD_EXPENSES_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import {
  fetchAllExpenses,
  insertExpense as insertExpenseDb,
  updateExpense as updateExpenseDb,
  deleteExpense as deleteExpenseDb,
} from '../lib/cardExpensesDb';
import { randomUUID } from '../lib/uuid';

export function useCardExpenses() {
  const [expenses, setExpenses] = useState<CardExpense[]>([]);
  const [useSupabaseSync, setUseSupabaseSync] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchAllExpenses();
          if (!cancelled) {
            setExpenses(data);
            setUseSupabaseSync(true);
          }
        } catch (e) {
          logError('Failed to load card expenses from Supabase', e);
          if (!cancelled) setUseSupabaseSync(false);
          const saved = localStorage.getItem(CARD_EXPENSES_STORAGE_KEY);
          if (saved) {
            try {
              if (!cancelled) setExpenses(JSON.parse(saved));
            } catch {
              logError('Failed to parse localStorage card expenses', e);
            }
          }
        } finally {
          if (!cancelled) setIsLoadingExpenses(false);
        }
      } else {
        try {
          const raw = localStorage.getItem(CARD_EXPENSES_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as CardExpense[];
            if (Array.isArray(parsed)) setExpenses(parsed);
          }
        } catch {
          // ignore
        }
        setIsLoadingExpenses(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !useSupabaseSync) {
      localStorage.setItem(CARD_EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses, useSupabaseSync]);

  const addExpense = useCallback(
    async (expense: Omit<CardExpense, 'id' | 'createdAt'>) => {
      const newExpense: CardExpense = {
        ...expense,
        id: randomUUID(),
        createdAt: Date.now(),
      };
      if (useSupabaseSync) {
        const prev = expenses;
        setExpenses((e) => [newExpense, ...e]);
        try {
          const saved = await insertExpenseDb(newExpense);
          setExpenses((e) => e.map((x) => (x.id === newExpense.id ? saved : x)));
        } catch (err) {
          logError('Failed to insert card expense', err);
          setExpenses(prev);
          throw err;
        }
      } else {
        setExpenses((prev) => [newExpense, ...prev]);
      }
      return newExpense;
    },
    [expenses, useSupabaseSync]
  );

  /**
   * Atualiza um gasto. Se ele pertencer a um grupo parcelado (parentInstallmentId),
   * propaga os campos compartilhados (nome, valor, cartão, nº de parcelas, categoria e tag)
   * para todas as parcelas do grupo, preservando data/fatura/nº da parcela de cada uma.
   */
  const updateExpense = useCallback(
    async (expense: CardExpense) => {
      const groupId = expense.parentInstallmentId;
      const applyChange = (list: CardExpense[]): CardExpense[] =>
        list.map((e) => {
          if (e.id === expense.id) return expense;
          if (groupId && e.parentInstallmentId === groupId) {
            return {
              ...e,
              name: expense.name,
              amount: expense.amount,
              cardId: expense.cardId,
              installmentsCount: expense.installmentsCount,
              category: expense.category,
              tag: expense.tag,
            };
          }
          return e;
        });

      if (useSupabaseSync) {
        const prev = expenses;
        const optimistic = applyChange(expenses);
        setExpenses(optimistic);
        try {
          const changed = optimistic.filter(
            (e) => e.id === expense.id || (groupId && e.parentInstallmentId === groupId)
          );
          const saved = await Promise.all(changed.map((e) => updateExpenseDb(e)));
          const savedById = new Map(saved.map((s) => [s.id, s]));
          setExpenses((e) => e.map((x) => savedById.get(x.id) ?? x));
        } catch (err) {
          logError('Failed to update card expense', err);
          setExpenses(prev);
          throw err;
        }
      } else {
        setExpenses((prev) => applyChange(prev));
      }
    },
    [expenses, useSupabaseSync]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const previous = expenses;
      setExpenses((e) => e.filter((x) => x.id !== id));
      if (useSupabaseSync) {
        deleteExpenseDb(id).catch((err) => {
          logError('Failed to delete card expense', err);
          setExpenses(previous);
        });
      }
    },
    [expenses, useSupabaseSync]
  );

  const getExpensesByCard = useCallback(
    (cardId: string, month: number, year: number): CardExpense[] => {
      return expenses.filter(
        (e) => e.cardId === cardId && e.billingMonth === month && e.billingYear === year
      );
    },
    [expenses]
  );

  const getInvoiceTotal = useCallback(
    (cardId: string, month: number, year: number): number => {
      return getExpensesByCard(cardId, month, year).reduce((sum, e) => sum + e.amount, 0);
    },
    [getExpensesByCard]
  );

  const getAllExpensesForCard = useCallback(
    (cardId: string): CardExpense[] => {
      return expenses.filter((e) => e.cardId === cardId);
    },
    [expenses]
  );

  const getTotalUsedByCard = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.cardId] = (map[e.cardId] ?? 0) + e.amount;
    }
    return map;
  }, [expenses]);

  return {
    expenses,
    isLoadingExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByCard,
    getInvoiceTotal,
    getAllExpensesForCard,
    getTotalUsedByCard,
  };
}
