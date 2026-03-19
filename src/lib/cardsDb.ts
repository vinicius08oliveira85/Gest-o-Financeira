import { supabase } from './supabase';
import type { CreditCard } from '../types';

export type CreditCardRow = {
  id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color?: string | null;
  created_at?: string | null;
};

export function rowToCard(row: CreditCardRow): CreditCard {
  return {
    id: row.id,
    name: row.name,
    limitAmount: Number(row.limit_amount),
    closingDay: row.closing_day,
    dueDay: row.due_day,
    color: row.color ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

export function cardToRow(
  card: Omit<CreditCard, 'id'> & { id?: string }
): Omit<CreditCardRow, 'id' | 'created_at'> {
  return {
    name: card.name,
    limit_amount: card.limitAmount,
    closing_day: card.closingDay,
    due_day: card.dueDay,
    color: card.color ?? null,
  };
}

export async function fetchCards(): Promise<CreditCard[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToCard(row as CreditCardRow));
}

export async function upsertCard(
  card: Omit<CreditCard, 'id'> & { id?: string }
): Promise<CreditCard> {
  if (!supabase) throw new Error('Supabase not configured');
  const id = card.id ?? crypto.randomUUID();
  const row = cardToRow(card);
  const payload = { id, ...row };
  const { data, error } = await supabase
    .from('credit_cards')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToCard(data as CreditCardRow);
}

export async function deleteCard(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('credit_cards').delete().eq('id', id);
  if (error) throw error;
}
