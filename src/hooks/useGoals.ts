import { useEffect, useMemo, useState } from 'react';
import type { Goal } from '../types';

const STORAGE_KEY = 'gestao-financeira-goals';

export function useGoals(month: number, year: number) {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Goal[];
      if (Array.isArray(parsed)) {
        setGoals(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  const currentGoal = useMemo(
    () => goals.find((g) => g.month === month && g.year === year) ?? null,
    [goals, month, year]
  );

  function upsertGoal(goal: Omit<Goal, 'id'> & { id?: string }) {
    setGoals((prev) => {
      if (goal.id) {
        return prev.map((g) => (g.id === goal.id ? (goal as Goal) : g));
      }
      const id = crypto.randomUUID();
      const next: Goal = { ...(goal as Omit<Goal, 'id'>), id };
      return [...prev, next];
    });
  }

  function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  return {
    goals,
    currentGoal,
    upsertGoal,
    deleteGoal,
  };
}

