import { useEffect, useState, useCallback } from 'react';
import type { Goal } from '../types';
import { GOALS_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fetchGoals, upsertGoal as upsertGoalDb, deleteGoal as deleteGoalDb } from '../lib/goalsDb';
import { randomUUID } from '../lib/uuid';
import { readStored, writeStored } from '../lib/storage';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [useSupabaseSync, setUseSupabaseSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchGoals();
          if (!cancelled) {
            setGoals(data);
            setUseSupabaseSync(true);
          }
          if (data.length === 0) {
            const saved = await readStored<Goal>(GOALS_STORAGE_KEY);
            if (saved.length > 0 && !cancelled) {
              // Só remove o backup local se TODOS os upserts derem certo —
              // falha parcial não pode apagar metas que ficaram só no dispositivo.
              let migrationFailed = false;
              for (const g of saved) {
                try {
                  await upsertGoalDb(g);
                } catch (e) {
                  migrationFailed = true;
                  logError('Migration goal failed', e);
                }
              }
              const refetched = await fetchGoals();
              if (!cancelled) setGoals(refetched);
              if (!migrationFailed) {
                // Migration successful, data now in Supabase
              }
            }
          }
        } catch (e) {
          logError('Failed to load goals from Supabase', e);
          if (!cancelled) setUseSupabaseSync(false);
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

  useEffect(() => {
    if (!isSupabaseConfigured() || !useSupabaseSync) {
      writeStored(GOALS_STORAGE_KEY, goals);
    }
  }, [goals, useSupabaseSync]);

  const upsertGoal = useCallback(
    (goal: Omit<Goal, 'id'> & { id?: string }) => {
      if (useSupabaseSync) {
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
            logError('Failed to save goal to Supabase', err);
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
    [goals, useSupabaseSync]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      const previous = goals;
      setGoals((g) => g.filter((x) => x.id !== id));
      if (useSupabaseSync) {
        deleteGoalDb(id).catch((err) => {
          logError('Failed to delete goal from Supabase', err);
          setGoals(previous);
        });
      }
    },
    [goals, useSupabaseSync]
  );

  return {
    goals,
    upsertGoal,
    deleteGoal,
    isLoadingGoals: isLoading,
  };
}
