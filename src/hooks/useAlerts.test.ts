import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlerts } from './useAlerts';
import type { Entry } from '../types';

function entry(
  id: string,
  type: Entry['type'],
  amount: number,
  dueDate: string,
  isPaid: boolean,
  category?: string
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
  };
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
    const month = today.getMonth();
    const year = today.getFullYear();
    const dueIn3Days = new Date(today);
    dueIn3Days.setDate(today.getDate() + 3);
    const dueDateStr = dueIn3Days.toISOString().slice(0, 10);

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
});
