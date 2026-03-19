import { supabase } from './supabase';
import type { CardExpense } from '../types';

export type CardExpenseRow = {
  id: string;
  card_id: string;
  name: string;
  amount: number;
  date: string;
  billing_month: number;
  billing_year: number;
  category?: string | null;
  tag?: string | null;
  installments_count?: number | null;
  installment_number?: number | null;
  parent_installment_id?: string | null;
  created_at?: string | null;
};

export function rowToExpense(row: CardExpenseRow): CardExpense {
  return {
    id: row.id,
    cardId: row.card_id,
    name: row.name,
    amount: Number(row.amount),
    date: row.date,
    billingMonth: row.billing_month,
    billingYear: row.billing_year,
    category: row.category ?? undefined,
    tag: row.tag ?? undefined,
    installmentsCount: row.installments_count ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
    parentInstallmentId: row.parent_installment_id ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function expenseToRow(
  expense: Omit<CardExpense, 'id'> & { id?: string }
): Omit<CardExpenseRow, 'id' | 'created_at'> {
  return {
    card_id: expense.cardId,
    name: expense.name,
    amount: expense.amount,
    date: expense.date,
    billing_month: expense.billingMonth,
    billing_year: expense.billingYear,
    category: expense.category ?? null,
    tag: expense.tag ?? null,
    installments_count: expense.installmentsCount ?? null,
    installment_number: expense.installmentNumber ?? null,
    parent_installment_id: expense.parentInstallmentId ?? null,
  };
}

export async function fetchExpensesByCard(cardId: string): Promise<CardExpense[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('card_expenses')
    .select('*')
    .eq('card_id', cardId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToExpense(row as CardExpenseRow));
}

export async function fetchAllExpenses(): Promise<CardExpense[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('card_expenses')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToExpense(row as CardExpenseRow));
}

export async function insertExpense(expense: Omit<CardExpense, 'id'>): Promise<CardExpense> {
  if (!supabase) throw new Error('Supabase not configured');
  const id = crypto.randomUUID();
  const row = expenseToRow(expense);
  const payload = { id, ...row };
  const { data, error } = await supabase.from('card_expenses').insert(payload).select('*').single();
  if (error) throw error;
  return rowToExpense(data as CardExpenseRow);
}

export async function updateExpense(expense: CardExpense): Promise<CardExpense> {
  if (!supabase) throw new Error('Supabase not configured');
  const { id, ...rest } = expense;
  const row = expenseToRow({ id, ...rest });
  const { data, error } = await supabase
    .from('card_expenses')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToExpense(data as CardExpenseRow);
}

export async function deleteExpense(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('card_expenses').delete().eq('id', id);
  if (error) throw error;
}
