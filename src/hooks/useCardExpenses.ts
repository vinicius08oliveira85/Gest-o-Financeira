import { useEffect, useState, useCallback, useMemo } from 'react';
import type { CardExpense } from '../types';
import { CARD_EXPENSES_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import {
  fetchAllExpenses,
  insertExpense as insertExpenseDb,
  upsertExpense as upsertExpenseDb,
  updateExpense as updateExpenseDb,
  deleteExpense as deleteExpenseDb,
  deleteExpensesByCard as deleteExpensesByCardDb,
} from '../lib/cardExpensesDb';
import { randomUUID } from '../lib/uuid';
import { propagateInstallmentUpdate } from '../lib/installments';
import { readStored, writeStored } from '../lib/storage';
import { mergeUnconfirmed } from '../lib/recovery';

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
          // Lê o espelho local ANTES de sobrescrever o estado: quando a nuvem devolveva
          // ao menos uma linha, os gastos que existiam só neste dispositivo sumiam.
          const saved = await readStored<CardExpense>(CARD_EXPENSES_STORAGE_KEY);
          const localOnly = saved.filter((e) => !data.some((d) => d.id === e.id));

          if (!cancelled) {
            setExpenses(data);
            setUseSupabaseSync(true);
          }
          if (localOnly.length > 0 && !cancelled) {
            // `upsertExpense` preserva o id; `insertExpense` geraria um id novo e
            // duplicaria o gasto a cada hydrate.
            for (const expense of localOnly) {
              try {
                await upsertExpenseDb(expense);
              } catch (e) {
                logError('Migration card expense failed', e);
              }
            }
            const refetched = await fetchAllExpenses();
            if (!cancelled) {
              // O que o servidor recusou continua visível e no espelho local.
              setExpenses(mergeUnconfirmed(refetched, localOnly));
            }
          }
        } catch (e) {
          logError('Failed to load card expenses from Supabase', e);
          if (!cancelled) setUseSupabaseSync(false);
          const saved = await readStored<CardExpense>(CARD_EXPENSES_STORAGE_KEY);
          if (saved.length > 0 && !cancelled) setExpenses(saved);
        } finally {
          if (!cancelled) setIsLoadingExpenses(false);
        }
      } else {
        const saved = await readStored<CardExpense>(CARD_EXPENSES_STORAGE_KEY);
        if (saved.length > 0) setExpenses(saved);
        setIsLoadingExpenses(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Espelho local sempre ativo: nada é gravado antes do hydrate (o estado inicial
   * `[]` apagava o backup) e o espelho acompanha o estado mesmo em modo nuvem,
   * para que um reload após falha de sync não restaure uma cópia velha.
   */
  useEffect(() => {
    if (isLoadingExpenses) return;
    writeStored(CARD_EXPENSES_STORAGE_KEY, expenses);
  }, [expenses, isLoadingExpenses]);

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
        propagateInstallmentUpdate(list, expense);

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

  /** Remove todos os gastos de um cartão (ao excluir o cartão), local e servidor. */
  const deleteExpensesByCard = useCallback(
    (cardId: string) => {
      const previous = expenses;
      setExpenses((e) => e.filter((x) => x.cardId !== cardId));
      if (useSupabaseSync) {
        deleteExpensesByCardDb(cardId).catch((err) => {
          logError('Failed to delete card expenses', err);
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
    deleteExpensesByCard,
    getExpensesByCard,
    getInvoiceTotal,
    getAllExpensesForCard,
    getTotalUsedByCard,
  };
}
