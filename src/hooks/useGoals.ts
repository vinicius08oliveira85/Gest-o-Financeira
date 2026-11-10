import { useEffect, useState, useCallback } from 'react';
import type { Goal } from '../types';
import { GOALS_STORAGE_KEY } from '../constants';
import { isCloudConfigured } from '../lib/appwrite';
import { logError } from '../lib/logger';
import { fetchGoals, upsertGoal as upsertGoalDb, deleteGoal as deleteGoalDb } from '../lib/goalsDb';
import { randomUUID } from '../lib/uuid';
import { readStored, writeStored } from '../lib/storage';
import { mergeUnconfirmed } from '../lib/recovery';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [useCloudSync, setUseAppwriteSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isCloudConfigured()) {
        try {
          const data = await fetchGoals();
          // Lê o espelho local ANTES de sobrescrever o estado: quando a nuvem devolveva
          // ao menos uma linha, as metas que existiam só neste dispositivo sumiam.
          const saved = await readStored<Goal>(GOALS_STORAGE_KEY);
          const localOnly = saved.filter((g) => !data.some((d) => d.id === g.id));

          if (!cancelled) {
            setGoals(data);
            setUseAppwriteSync(true);
          }
          if (localOnly.length > 0 && !cancelled) {
            for (const g of localOnly) {
              try {
                await upsertGoalDb(g);
              } catch (e) {
                logError('Migration goal failed', e);
              }
            }
            const refetched = await fetchGoals();
            if (!cancelled) {
              // O que o servidor recusou (ou demorar a refletir) continua visível
              // e no espelho, para ser reenviado no próximo hydrate.
              setGoals(mergeUnconfirmed(refetched, localOnly));
            }
          }
        } catch (e) {
          logError('Failed to load goals from Appwrite', e);
          if (!cancelled) setUseAppwriteSync(false);
          const saved = await readStored<Goal>(GOALS_STORAGE_KEY);
          if (saved.length > 0 && !cancelled) setGoals(saved);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        const saved = await readStored<Goal>(GOALS_STORAGE_KEY);
        if (saved.length > 0) setGoals(saved);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Espelho local sempre ativo.
   *
   * Antes isto só gravava fora do modo nuvem, e mesmo aí rodava na montagem com o
   * estado inicial `[]` — apagando o backup antes do hydrate terminar. Em modo nuvem
   * o espelho ficava congelado no estado antigo, então um reload após falha de sync
   * restaurava uma cópia velha. Agora: nada é gravado antes do hydrate e o espelho
   * acompanha o estado sempre, sendo a nuvem quem manda quando responde.
   */
  useEffect(() => {
    if (isLoading) return;
    writeStored(GOALS_STORAGE_KEY, goals);
  }, [goals, isLoading]);

  const upsertGoal = useCallback(
    (goal: Omit<Goal, 'id'> & { id?: string }) => {
      if (useCloudSync) {
        const prev = goals;
        const optimisticId = goal.id ?? randomUUID();
        const optimistic: Goal = { ...(goal as Omit<Goal, 'id'>), id: optimisticId };
        setGoals((g) =>
          goal.id ? g.map((x) => (x.id === goal.id ? optimistic : x)) : [...g, optimistic]
        );
        upsertGoalDb({ ...goal, id: optimisticId })
          .then((saved) => {
            setGoals((g) => g.map((x) => (x.id === optimisticId ? saved : x)));
          })
          .catch((err) => {
            logError('Failed to save goal to Appwrite', err);
            setGoals(prev);
          });
      } else {
        setGoals((prev) => {
          if (goal.id) {
            return prev.map((g) => (g.id === goal.id ? (goal as Goal) : g));
          }
          const id = randomUUID();
          const createdAt = new Date().toISOString();
          return [...prev, { ...(goal as Omit<Goal, 'id'>), id, createdAt }];
        });
      }
    },
    [goals, useCloudSync]
  );

  /**
   * Remove a meta e os lançamentos vinculados. No modo nuvem a remoção local só
   * acontece depois que o banco confirma a transação única; se falhar, nada muda.
   */
  const deleteGoal = useCallback(
    async (id: string): Promise<boolean> => {
      if (!useCloudSync) {
        setGoals((g) => g.filter((x) => x.id !== id));
        return true;
      }
      try {
        await deleteGoalDb(id);
        setGoals((g) => g.filter((x) => x.id !== id));
        return true;
      } catch (err) {
        logError('Failed to delete goal from Appwrite', err);
        return false;
      }
    },
    [useCloudSync]
  );

  return {
    goals,
    upsertGoal,
    deleteGoal,
    isLoadingGoals: isLoading,
  };
}
