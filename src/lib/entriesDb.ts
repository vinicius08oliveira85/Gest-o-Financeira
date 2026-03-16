import { supabase } from './supabase';
import type { Entry, EntryType } from '../types';

export type EntryRow = {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  type: string;
  created_at: string;
  category?: string | null;
  tag?: string | null;
  installments_count?: number | null;
  installment_number?: number | null;
  parent_installment_id?: string | null;
  is_recurring?: boolean | null;
  recurrence_count?: number | null;
  recurrence_template_id?: string | null;
};

export function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    dueDate: row.due_date,
    isPaid: row.is_paid,
    type: row.type as EntryType,
    createdAt: new Date(row.created_at).getTime(),
    category: row.category ?? undefined,
    tag: row.tag ?? undefined,
    installmentsCount: row.installments_count ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
    parentInstallmentId: row.parent_installment_id ?? undefined,
    isRecurring: row.is_recurring ?? undefined,
    recurrenceCount: row.recurrence_count ?? undefined,
    recurrenceTemplateId: row.recurrence_template_id ?? undefined,
  };
}

export function entryToRow(entry: Entry): Omit<EntryRow, 'created_at' | 'id'> {
  return {
    name: entry.name,
    amount: entry.amount,
    due_date: entry.dueDate,
    is_paid: entry.isPaid,
    type: entry.type,
    category: entry.category ?? null,
    tag: entry.tag ?? null,
    installments_count: entry.installmentsCount ?? null,
    installment_number: entry.installmentNumber ?? null,
    parent_installment_id: entry.parentInstallmentId ?? null,
    is_recurring: entry.isRecurring ?? null,
    recurrence_count: entry.recurrenceCount ?? null,
    recurrence_template_id: entry.recurrenceTemplateId ?? null,
  };
}

export async function fetchEntries(): Promise<Entry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToEntry(row as EntryRow));
}

export async function insertEntry(entry: Entry): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('entries').insert({ ...entryToRow(entry), id: entry.id });
  if (error) throw error;
}

function entryToBatchRow(entry: Entry): Record<string, unknown> {
  const row = entryToRow(entry);
  return {
    id: entry.id,
    ...row,
    created_at: new Date(entry.createdAt).toISOString(),
  };
}

export async function insertEntriesBatch(entries: Entry[]): Promise<void> {
  if (!supabase || entries.length === 0) return;
  const payload = entries.map(entryToBatchRow);
  const { error } = await supabase.rpc('insert_entries_batch', { entries_json: payload });
  if (error) throw error;
}

export async function updateEntry(entry: Entry): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('entries').update(entryToRow(entry)).eq('id', entry.id);
  if (error) throw error;
}

export async function updateEntryIsPaid(id: string, isPaid: boolean): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('entries').update({ is_paid: isPaid }).eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}
