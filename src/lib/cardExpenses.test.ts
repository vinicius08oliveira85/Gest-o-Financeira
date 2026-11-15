import { describe, it, expect } from 'vitest';
import { getOrphanCardExpenses, getOrphanCardIds } from './cardExpenses';
import type { CardExpense, CreditCard } from '../types';

function card(id: string): CreditCard {
  return { id, name: `Cartão ${id}`, limitAmount: 1000, closingDay: 5, dueDay: 12 };
}

function expense(id: string, cardId: string, amount = 100): CardExpense {
  return {
    id,
    cardId,
    name: `Gasto ${id}`,
    amount,
    date: '2026-11-01',
    billingMonth: 10,
    billingYear: 2026,
    createdAt: 1,
  };
}

describe('gastos de cartão órfãos', () => {
  it('encontra só os gastos de cartões que não existem mais', () => {
    const cards = [card('a')];
    const expenses = [expense('e1', 'a'), expense('e2', 'sumiu', 250), expense('e3', 'sumiu', 50)];

    expect(getOrphanCardExpenses(expenses, cards).map((e) => e.id)).toEqual(['e2', 'e3']);
  });

  it('devolve os ids distintos, para remover uma vez por cartão', () => {
    const cards = [card('a'), card('b')];
    const expenses = [
      expense('e1', 'a'),
      expense('e2', 'x'),
      expense('e3', 'b'),
      expense('e4', 'x'),
      expense('e5', 'y'),
    ];

    expect(getOrphanCardIds(expenses, cards)).toEqual(['x', 'y']);
  });

  it('não aponta órfãos quando todos os gastos têm cartão', () => {
    const cards = [card('a'), card('b')];
    const expenses = [expense('e1', 'a'), expense('e2', 'b')];

    expect(getOrphanCardExpenses(expenses, cards)).toEqual([]);
    expect(getOrphanCardIds(expenses, cards)).toEqual([]);
  });
});
