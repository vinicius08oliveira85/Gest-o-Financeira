import { describe, it, expect } from 'vitest';
import type { Loan } from '../types';
import { getLoanTotals } from './loans';

function loan(id: string, amount: number, dueDate: string, paid = false): Loan {
  return {
    id,
    name: 'Empréstimo',
    sourceType: 'pessoa_fisica',
    amount,
    dueDate,
    paid,
    createdAt: 0,
  };
}

describe('getLoanTotals', () => {
  const today = '2026-11-08';

  it('retorna zeros quando não há empréstimos', () => {
    expect(getLoanTotals([], today)).toEqual({ open: 0, overdue: 0 });
  });

  it('soma em aberto e vencidos separadamente', () => {
    const loans = [
      loan('a', 100, '2026-11-01'), // vencido e não pago
      loan('b', 200, '2026-11-20'), // em aberto, no prazo
      loan('c', 300, '2026-11-08'), // vence hoje: não é vencido
    ];
    expect(getLoanTotals(loans, today)).toEqual({ open: 600, overdue: 100 });
  });

  it('ignora empréstimos pagos, mesmo com vencimento passado', () => {
    const loans = [loan('a', 100, '2026-10-01', true), loan('b', 50, '2026-10-01')];
    expect(getLoanTotals(loans, today)).toEqual({ open: 50, overdue: 50 });
  });
});
