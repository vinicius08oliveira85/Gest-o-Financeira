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
  goal_id?: string | null;
  paid_date?: string | null;
  card_id?: string | null;
  is_card_invoice?: boolean | null;
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
    goalId: row.goal_id ?? undefined,
    paidDate: row.paid_date ?? undefined,
    cardId: row.card_id ?? undefined,
    isCardInvoice: row.is_card_invoice ?? undefined,
  };
}

export function entryToRow(entry: Entry): Omit<EntryRow, 'created_at' | 'id'> {
  const base: Omit<
    EntryRow,
    'created_at' | 'id' | 'is_recurring' | 'recurrence_count' | 'recurrence_template_id' | 'goal_id'
  > = {
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
  };
  // Colunas adicionadas por migration: só inclui quando têm valor
  // para evitar 400 caso a coluna ainda não exista no banco
  const extended: Partial<EntryRow> = {};
  if (entry.isRecurring != null) extended.is_recurring = entry.isRecurring;
  if (entry.recurrenceCount != null) extended.recurrence_count = entry.recurrenceCount;
  if (entry.recurrenceTemplateId != null)
    extended.recurrence_template_id = entry.recurrenceTemplateId;
  if (entry.goalId != null) extended.goal_id = entry.goalId;
  if (entry.paidDate != null) extended.paid_date = entry.paidDate;
  if (entry.cardId != null) extended.card_id = entry.cardId;
  if (entry.isCardInvoice != null) extended.is_card_invoice = entry.isCardInvoice;
  return { ...base, ...extended };
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
  const row = { ...entryToRow(entry), id: entry.id };
  const { error } = await supabase.from('entries').insert(row);
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
  const row = entryToRow(entry);
  const { error } = await supabase.from('entries').update(row).eq('id', entry.id);
  if (error) throw error;
}

export async function updateEntryIsPaid(
  id: string,
  isPaid: boolean,
  paidDate?: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('entries')
    .update({ is_paid: isPaid, paid_date: paidDate ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}
