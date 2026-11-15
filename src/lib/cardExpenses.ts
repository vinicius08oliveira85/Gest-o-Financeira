import type { CardExpense, CreditCard } from '../types';

/**
 * Gastos de cartão cujo cartão não existe mais — típico de uma exclusão feita em
 * outro dispositivo antes de a cascata de exclusão existir no servidor. Esses
 * gastos não pertencem a nenhum cartão na tela, mas continuam somando no gráfico
 * de evolução e no CSV como consumo de cartão.
 */
export function getOrphanCardExpenses(expenses: CardExpense[], cards: CreditCard[]): CardExpense[] {
  const cardIds = new Set(cards.map((card) => card.id));
  return expenses.filter((expense) => !cardIds.has(expense.cardId));
}

/** Ids distintos dos cartões citados por gastos órfãos, para remover por cartão. */
export function getOrphanCardIds(expenses: CardExpense[], cards: CreditCard[]): string[] {
  return [...new Set(getOrphanCardExpenses(expenses, cards).map((expense) => expense.cardId))];
}
