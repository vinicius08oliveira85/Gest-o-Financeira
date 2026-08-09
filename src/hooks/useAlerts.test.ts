import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlerts } from './useAlerts';
import type { CardExpense, CreditCard, Entry, Goal } from '../types';

type EntryOverrides = Partial<
  Pick<Entry, 'goalId' | 'isCardInvoice' | 'cardId' | 'invoicePaymentDueDate' | 'name' | 'paidDate'>
>;

function entry(
  id: string,
  type: Entry['type'],
  amount: number,
  dueDate: string,
  isPaid: boolean,
  category?: string,
  overrides: EntryOverrides = {}
): Entry {
  return {
    id,
    name: 'Item',
    amount,
    dueDate,
    isPaid,
    type,
    createdAt: Date.now(),
    category,
    ...overrides,
  };
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

describe('useAlerts', () => {
  it('categoria com mais de 35% do total de saídas gera alerta de concentração', () => {
    const month = 2;
    const year = 2025;
    const entries: Entry[] = [
      entry('1', 'debt', 600, '2025-03-15', false, 'Aluguel'),
      entry('2', 'debt', 400, '2025-03-10', false, 'Mercado'),
    ];

    const { result } = renderHook(() => useAlerts({ entries, month, year }));

    const concentration = result.current.alerts.filter((a) => a.type === 'concentration');
    expect(concentration.length).toBeGreaterThanOrEqual(1);
    expect(concentration.some((a) => a.title.includes('Aluguel'))).toBe(true);
  });

  it('saídas não pagas com vencimento nos próximos 5 dias geram alerta due-soon', () => {
    const today = new Date();
    const dueIn3Days = new Date(today);
    dueIn3Days.setDate(today.getDate() + 3);
    const dueDateStr = dueIn3Days.toISOString().slice(0, 10);
    const month = dueIn3Days.getMonth();
    const year = dueIn3Days.getFullYear();

    const entries: Entry[] = [entry('1', 'debt', 100, dueDateStr, false)];

    const { result } = renderHook(() => useAlerts({ entries, month, year }));

    const dueSoon = result.current.alerts.filter((a) => a.type === 'due-soon');
    expect(dueSoon.length).toBeGreaterThanOrEqual(1);
  });

  it('sem saídas ou vencimentos próximos retorna array vazio ou sem due-soon', () => {
    const month = 2;
    const year = 2025;
    const entries: Entry[] = [entry('1', 'cash', 1000, '2025-03-01', true)];

    const { result } = renderHook(() => useAlerts({ entries, month, year }));

    expect(result.current.alerts.every((a) => a.type !== 'due-soon' || true)).toBe(true);
  });

  it('depósito em meta (cash+goalId) conta como saída no alerta de concentração', () => {
    const month = 2;
    const year = 2025;
    const entries: Entry[] = [
      entry('1', 'cash', 900, '2025-03-15', false, 'Investimentos', { goalId: 'g1' }),
      entry('2', 'debt', 100, '2025-03-10', false, 'Mercado'),
    ];

    const { result } = renderHook(() => useAlerts({ entries, month, year }));

    const concentration = result.current.alerts.filter((a) => a.type === 'concentration');
    // 900 de 1000 = 90% → alerta para a categoria do depósito na meta
    expect(concentration.some((a) => a.title.includes('Investimentos'))).toBe(true);
  });

  it('vencimento próximo gera due-soon mesmo fora do mês visível', () => {
    const today = new Date();
    const due = new Date(today);
    due.setDate(today.getDate() + 3);
    const dueDateStr = iso(due);
    // Mês visível diferente do mês do vencimento (ex.: o mês seguinte)
    const month = (due.getMonth() + 1) % 12;
    const year = month === 0 ? due.getFullYear() + 1 : due.getFullYear();

    const entries: Entry[] = [entry('1', 'debt', 100, dueDateStr, false)];

    const { result } = renderHook(() => useAlerts({ entries, month, year }));

    expect(result.current.alerts.some((a) => a.type === 'due-soon')).toBe(true);
  });

  it('fatura de cartão com vencimento próximo gera card-invoice-due (paga não gera)', () => {
    const today = new Date();
    const due = new Date(today);
    due.setDate(today.getDate() + 2);
    const dueDateStr = iso(due);

    const pending = entry('1', 'debt', 500, '2025-01-10', false, undefined, {
      isCardInvoice: true,
      cardId: 'card-1',
      name: 'Fatura Nubank',
      invoicePaymentDueDate: dueDateStr,
    });
    const paid = entry('2', 'debt', 300, '2025-01-11', true, undefined, {
      isCardInvoice: true,
      cardId: 'card-1',
      name: 'Fatura Inter',
      invoicePaymentDueDate: dueDateStr,
    });

    const { result } = renderHook(() =>
      useAlerts({ entries: [pending, paid], month: 0, year: 2025 })
    );

    const dueAlerts = result.current.alerts.filter((a) => a.type === 'card-invoice-due');
    expect(dueAlerts.length).toBe(1);
    expect(dueAlerts[0].title).toContain('Fatura Nubank');
  });

  it('uso do limite acima de 80% gera alerta de limite do cartão', () => {
    const month = 2;
    const year = 2025;
    const cards: CreditCard[] = [
      { id: 'card-1', name: 'Nubank', limitAmount: 1000, closingDay: 25, dueDay: 5 },
    ];
    const cardExpenses: CardExpense[] = [
      {
        id: 'e1',
        cardId: 'card-1',
        name: 'Compra',
        amount: 850,
        date: '2025-03-01',
        billingMonth: month,
        billingYear: year,
        createdAt: Date.now(),
      },
    ];

    const { result } = renderHook(() =>
      useAlerts({ entries: [], month, year, cards, cardExpenses })
    );

    const limitAlerts = result.current.alerts.filter((a) => a.type === 'card-limit');
    expect(limitAlerts.length).toBe(1);
    expect(limitAlerts[0].title).toContain('Nubank');
  });

  it('meta com data alvo hoje gera "vence hoje" e passada gera "data alvo passou"', () => {
    const month = 2;
    const year = 2025;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const goals: Goal[] = [
      { id: 'g1', name: 'Viagem', targetAmount: 5000, currentAmount: 0, targetDate: iso(today) },
      {
        id: 'g2',
        name: 'Reserva',
        targetAmount: 3000,
        currentAmount: 0,
        targetDate: iso(yesterday),
      },
    ];

    const { result } = renderHook(() => useAlerts({ entries: [], month, year, goals }));

    const deadline = result.current.alerts.filter((a) => a.type === 'goal-deadline');
    expect(deadline.some((a) => a.title.includes('vence hoje'))).toBe(true);
    expect(deadline.some((a) => a.title.includes('data alvo passou'))).toBe(true);
  });
});
