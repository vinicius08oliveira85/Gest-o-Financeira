import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import {
  deleteDocumentById,
  deleteDocumentsMatching,
  listAllDocuments,
  saveDocument,
} from './appwriteDb';
import type { Goal } from '../types';
import { randomUUID } from './uuid';

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
    // Enviado para preservar a data de criação local (e a ordenação de
    // `fetchGoals`) quando a meta é migrada do dispositivo para a nuvem.
    created_at: goal.createdAt ?? new Date().toISOString(),
  };
}

export async function fetchGoals(): Promise<Goal[]> {
  const rows = await listAllDocuments<GoalRow>(COLLECTIONS.goals, [Query.orderAsc('created_at')]);
  return rows.map((row) => rowToGoal({ ...row, id: row.$id }));
}

export async function upsertGoal(goal: Omit<Goal, 'id'> & { id?: string }): Promise<Goal> {
  const id = goal.id ?? randomUUID();
  const doc = await saveDocument<GoalRow>(COLLECTIONS.goals, id, {
    ...goalToRow(goal),
  });
  return rowToGoal({ ...doc, id: doc.$id });
}

/** Remove a meta e os lançamentos vinculados a ela (movimentos de depósito/saque). */
export async function deleteGoal(id: string): Promise<void> {
  await deleteDocumentsMatching(COLLECTIONS.entries, [Query.equal('goal_id', id)]);
  await deleteDocumentById(COLLECTIONS.goals, id);
}
