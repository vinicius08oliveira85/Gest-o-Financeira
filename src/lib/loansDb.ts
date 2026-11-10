import { supabase } from './supabase';
import type { Loan, LoanInstallment } from '../types';
import { randomUUID } from './uuid';

export type LoanRow = {
  id: string;
  name: string;
  amount: number;
  source_type: Loan['sourceType'];
  source_name?: string | null;
  due_date: string;
  paid: boolean;
  discount_start?: string | null;
  discount_end?: string | null;
  installments_count?: number | null;
  installments?: LoanInstallment[] | null;
  created_at?: string | null;
};

export function rowToLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    sourceType: row.source_type,
    sourceName: row.source_name ?? undefined,
    dueDate: row.due_date,
    paid: row.paid ?? false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    discountStart: row.discount_start ?? undefined,
    discountEnd: row.discount_end ?? undefined,
    installmentsCount: row.installments_count ?? undefined,
    installments: Array.isArray(row.installments)
      ? row.installments.map((i) => ({ ...i, amount: Number(i.amount) }))
      : undefined,
  };
}

export function loanToRow(
  loan: Omit<Loan, 'id' | 'createdAt'>
): Omit<LoanRow, 'id' | 'created_at'> {
  return {
    name: loan.name,
    amount: loan.amount,
    source_type: loan.sourceType,
    source_name: loan.sourceName?.trim() ? loan.sourceName.trim() : null,
    due_date: loan.dueDate,
    paid: loan.paid,
    discount_start: loan.discountStart ?? null,
    discount_end: loan.discountEnd ?? null,
    installments_count: loan.installmentsCount ?? null,
    installments: loan.installments ?? null,
  };
}

export async function fetchLoans(): Promise<Loan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToLoan(row as LoanRow));
}

export async function upsertLoan(
  loan: Omit<Loan, 'id' | 'createdAt'> & { id?: string }
): Promise<Loan> {
  if (!supabase) throw new Error('Supabase not configured');
  const id = loan.id ?? randomUUID();
  const { data, error } = await supabase
    .from('loans')
    .upsert({ id, ...loanToRow(loan) }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToLoan(data as LoanRow);
}

export async function deleteLoan(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('loans').delete().eq('id', id);
  if (error) throw error;
}
