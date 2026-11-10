import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import { deleteDocumentById, listAllDocuments, saveDocument } from './appwriteDb';
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
  const rows = await listAllDocuments<WishlistRow>(COLLECTIONS.wishlistItems, [
    Query.orderAsc('created_at'),
  ]);
  return rows.map((row) => rowToWishlistItem({ ...row, id: row.$id }));
}

export async function upsertWishlistItem(
  item: Omit<WishlistItem, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<WishlistItem> {
  const id = item.id ?? randomUUID();
  const doc = await saveDocument<WishlistRow>(COLLECTIONS.wishlistItems, id, {
    ...wishlistItemToRow(item),
    created_at: new Date(item.createdAt ?? Date.now()).toISOString(),
  });
  return rowToWishlistItem({ ...doc, id: doc.$id });
}

export async function deleteWishlistItem(id: string): Promise<void> {
  await deleteDocumentById(COLLECTIONS.wishlistItems, id);
}
