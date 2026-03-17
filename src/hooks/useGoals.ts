import { useEffect, useState, useCallback } from 'react';
import type { Goal } from '../types';
import { GOALS_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fetchGoals, upsertGoal as upsertGoalDb, deleteGoal as deleteGoalDb } from '../lib/goalsDb';

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
            const saved = localStorage.getItem(GOALS_STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved) as Goal[];
                if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
                  for (const g of parsed) {
                    try {
                      await upsertGoalDb(g);
                    } catch (e) {
                      logError('Migration goal failed', e);
                    }
                  }
                  const refetched = await fetchGoals();
                  if (!cancelled) setGoals(refetched);
                  localStorage.removeItem(GOALS_STORAGE_KEY);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        } catch (e) {
          logError('Failed to load goals from Supabase', e);
          if (!cancelled) setUseSupabaseSync(false);
          const saved = localStorage.getItem(GOALS_STORAGE_KEY);
          if (saved) {
            try {
              if (!cancelled) setGoals(JSON.parse(saved));
            } catch {
              logError('Failed to parse localStorage goals', e);
            }
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        try {
          const raw = localStorage.getItem(GOALS_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Goal[];
            if (Array.isArray(parsed)) setGoals(parsed);
          }
        } catch {
          // ignore
        }
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
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    }
  }, [goals, useSupabaseSync]);

  const upsertGoal = useCallback(
    (goal: Omit<Goal, 'id'> & { id?: string }) => {
      if (useSupabaseSync) {
        const prev = goals;
        const optimisticId = goal.id ?? crypto.randomUUID();
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
          const id = crypto.randomUUID();
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
