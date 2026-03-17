import { supabase } from './supabase';
import type { Goal } from '../types';

export type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  category?: string | null;
  target_date?: string | null;
  created_at?: string | null;
};

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    category: row.category ?? undefined,
    targetDate: row.target_date ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

export function goalToRow(goal: Omit<Goal, 'id'> & { id?: string }): Omit<GoalRow, 'id'> {
  return {
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    category: goal.category ?? null,
    target_date: goal.targetDate ?? null,
  };
}

export async function fetchGoals(): Promise<Goal[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToGoal(row as GoalRow));
}

export async function upsertGoal(goal: Omit<Goal, 'id'> & { id?: string }): Promise<Goal> {
  if (!supabase) throw new Error('Supabase not configured');
  const id = goal.id ?? crypto.randomUUID();
  const row = goalToRow(goal);
  const payload = { id, ...row };
  const { data, error } = await supabase
    .from('goals')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToGoal(data as GoalRow);
}

export async function deleteGoal(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}
