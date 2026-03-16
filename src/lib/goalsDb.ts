import { supabase } from './supabase';
import type { Goal } from '../types';

export type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  category?: string | null;
  month: number;
  year: number;
};

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    category: row.category ?? undefined,
    month: row.month,
    year: row.year,
  };
}

export function goalToRow(goal: Omit<Goal, 'id'> & { id?: string }): Omit<GoalRow, 'id'> {
  return {
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    category: goal.category ?? null,
    month: goal.month,
    year: goal.year,
  };
}

export async function fetchGoals(month?: number, year?: number): Promise<Goal[]> {
  if (!supabase) return [];
  let query = supabase
    .from('goals')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  if (month !== undefined && year !== undefined) {
    query = query.eq('month', month).eq('year', year);
  }
  const { data, error } = await query;
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
