import type { WishlistItem } from '../types';

export type WishlistTotals = {
  /** Soma dos itens ainda não comprados */
  pending: number;
  /** Soma dos itens já comprados (valores abatidos) */
  purchased: number;
};

export function getWishlistTotals(items: WishlistItem[]): WishlistTotals {
  let pending = 0;
  let purchased = 0;
  for (const item of items) {
    if (item.purchased) purchased += item.amount;
    else pending += item.amount;
  }
  return { pending, purchased };
}

/**
 * Deixa o link pronto para abrir: sem esquema, prefixa `https://` (o usuário
 * costuma colar "www.loja.com/item"). Retorna undefined quando não há link.
 */
export function normalizeWishlistUrl(url?: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}
