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
  };
}

export function entryToRow(entry: Entry): Omit<EntryRow, 'created_at' | 'id'> {
  return {
    name: entry.name,
    amount: entry.amount,
    due_date: entry.dueDate,
    is_paid: entry.isPaid,
    type: entry.type,
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

export async function updateEntry(entry: Entry): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('entries')
    .update(entryToRow(entry))
    .eq('id', entry.id);
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