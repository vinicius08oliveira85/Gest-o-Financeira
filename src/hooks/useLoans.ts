import { useEffect, useState, useCallback } from 'react';
import type { Loan } from '../types';
import { LOANS_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fetchLoans, upsertLoan as upsertLoanDb, deleteLoan as deleteLoanDb } from '../lib/loansDb';
import { randomUUID } from '../lib/uuid';
import { readStored, writeStored } from '../lib/storage';
import { mergeUnconfirmed } from '../lib/recovery';

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [useSupabaseSync, setUseSupabaseSync] = useState(false);
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchLoans();
          // Lê o espelho local ANTES de sobrescrever o estado, para não perder
          // empréstimos que existem só neste dispositivo.
          const saved = await readStored<Loan>(LOANS_STORAGE_KEY);
          const localOnly = saved.filter((l) => !data.some((d) => d.id === l.id));

          if (!cancelled) {
            setLoans(data);
            setUseSupabaseSync(true);
          }
          if (localOnly.length > 0 && !cancelled) {
            for (const l of localOnly) {
              try {
                await upsertLoanDb(l);
              } catch (e) {
                logError('Migration loan failed', e);
              }
            }
            const refetched = await fetchLoans();
            if (!cancelled) {
              setLoans(mergeUnconfirmed(refetched, localOnly));
            }
          }
        } catch (e) {
          logError('Failed to load loans from Supabase', e);
          if (!cancelled) setUseSupabaseSync(false);
          const saved = await readStored<Loan>(LOANS_STORAGE_KEY);
          if (saved.length > 0 && !cancelled) setLoans(saved);
        } finally {
          if (!cancelled) setIsLoadingLoans(false);
        }
      } else {
        const saved = await readStored<Loan>(LOANS_STORAGE_KEY);
        if (saved.length > 0) setLoans(saved);
        setIsLoadingLoans(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoadingLoans) return;
    writeStored(LOANS_STORAGE_KEY, loans);
  }, [loans, isLoadingLoans]);

  const upsertLoan = useCallback(
    (loan: Omit<Loan, 'id' | 'createdAt'> & { id?: string }) => {
      if (useSupabaseSync) {
        const optimisticId = loan.id ?? randomUUID();
        const previousItem = loans.find((l) => l.id === optimisticId);
        const optimistic = {
          ...loan,
          id: optimisticId,
          createdAt: previousItem?.createdAt ?? Date.now(),
        } as Loan;
        setLoans((ls) =>
          previousItem
            ? ls.map((x) => (x.id === optimisticId ? optimistic : x))
            : [...ls, optimistic]
        );
        upsertLoanDb({ ...loan, id: optimisticId })
          .then((saved) => {
            setLoans((ls) => ls.map((x) => (x.id === optimisticId ? saved : x)));
          })
          .catch((err) => {
            logError('Failed to save loan to Supabase', err);
            // Reverte só este empréstimo, sem apagar outras alterações feitas enquanto salvava.
            setLoans((ls) =>
              previousItem
                ? ls.map((x) => (x.id === optimisticId ? previousItem : x))
                : ls.filter((x) => x.id !== optimisticId)
            );
          });
      } else {
        setLoans((prev) => {
          if (loan.id) {
            return prev.map((l) =>
              l.id === loan.id ? ({ ...l, ...loan, id: loan.id } as Loan) : l
            );
          }
          return [...prev, { ...loan, id: randomUUID(), createdAt: Date.now() } as Loan];
        });
      }
    },
    [loans, useSupabaseSync]
  );

  const deleteLoan = useCallback(
    (id: string) => {
      const removed = loans.find((x) => x.id === id);
      setLoans((ls) => ls.filter((x) => x.id !== id));
      if (useSupabaseSync) {
        deleteLoanDb(id).catch((err) => {
          logError('Failed to delete loan from Supabase', err);
          // Devolve só o item removido, sem sobrescrever outras mudanças.
          if (removed) setLoans((ls) => [...ls, removed]);
        });
      }
    },
    [loans, useSupabaseSync]
  );

  return { loans, upsertLoan, deleteLoan, isLoadingLoans };
}
