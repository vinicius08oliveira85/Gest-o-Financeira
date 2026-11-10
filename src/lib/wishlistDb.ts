import { supabase } from './supabase';
import type { WishlistItem } from '../types';
import { randomUUID } from './uuid';

export type WishlistRow = {
  id: string;
  name: string;
  amount: number;
  url?: string | null;
  purchased: boolean;
  purchased_at?: string | null;
  entry_id?: string | null;
  created_at?: string | null;
};

export function rowToWishlistItem(row: WishlistRow): WishlistItem {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    url: row.url ?? undefined,
    purchased: row.purchased ?? false,
    purchasedAt: row.purchased_at ?? undefined,
    entryId: row.entry_id ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function wishlistItemToRow(
  item: Omit<WishlistItem, 'id' | 'createdAt'>
): Omit<WishlistRow, 'id' | 'created_at'> {
  return {
    name: item.name,
    amount: item.amount,
    url: item.url?.trim() ? item.url.trim() : null,
    purchased: item.purchased,
    purchased_at: item.purchasedAt ?? null,
    entry_id: item.entryId ?? null,
  };
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToWishlistItem(row as WishlistRow));
}

export async function upsertWishlistItem(
  item: Omit<WishlistItem, 'id' | 'createdAt'> & { id?: string }
): Promise<WishlistItem> {
  if (!supabase) throw new Error('Supabase not configured');
  const id = item.id ?? randomUUID();
  const { data, error } = await supabase
    .from('wishlist_items')
    .upsert({ id, ...wishlistItemToRow(item) }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToWishlistItem(data as WishlistRow);
}

export async function deleteWishlistItem(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
  if (error) throw error;
}
