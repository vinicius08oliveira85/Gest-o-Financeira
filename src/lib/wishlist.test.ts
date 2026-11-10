import { describe, it, expect } from 'vitest';
import { getWishlistTotals, normalizeWishlistUrl } from './wishlist';
import type { WishlistItem } from '../types';

function item(partial: Partial<WishlistItem>): WishlistItem {
  return {
    id: 'x',
    name: 'Item',
    amount: 100,
    purchased: false,
    createdAt: 0,
    ...partial,
  };
}

describe('getWishlistTotals', () => {
  it('separa o que falta comprar do que já foi comprado', () => {
    const totals = getWishlistTotals([
      item({ id: 'a', amount: 400 }),
      item({ id: 'b', amount: 100, purchased: true }),
      item({ id: 'c', amount: 50 }),
    ]);
    expect(totals).toEqual({ pending: 450, purchased: 100 });
  });

  it('lista vazia soma zero', () => {
    expect(getWishlistTotals([])).toEqual({ pending: 0, purchased: 0 });
  });
});

describe('normalizeWishlistUrl', () => {
  it('prefixa https:// quando o link vem sem esquema', () => {
    expect(normalizeWishlistUrl('www.loja.com/produto')).toBe('https://www.loja.com/produto');
  });

  it('mantém links http/https como estão', () => {
    expect(normalizeWishlistUrl('http://loja.com/x')).toBe('http://loja.com/x');
  });

  it('devolve undefined para link vazio', () => {
    expect(normalizeWishlistUrl('   ')).toBeUndefined();
    expect(normalizeWishlistUrl(undefined)).toBeUndefined();
  });
});
