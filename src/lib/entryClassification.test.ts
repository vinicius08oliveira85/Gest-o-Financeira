import { describe, it, expect } from 'vitest';
import type { Entry } from '../types';
import { isEntryInflow, isEntryOutflow } from './entryClassification';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    name: 'Lançamento',
    amount: 100,
    dueDate: '2026-11-10',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    ...overrides,
  };
}

describe('entryClassification', () => {
  it('despesa normal é saída e receita normal é entrada', () => {
    expect(isEntryOutflow(entry({ type: 'debt' }))).toBe(true);
    expect(isEntryInflow(entry({ type: 'cash' }))).toBe(true);
  });

  it('depósito na meta (cash + goalId) é saída do caixa', () => {
    const deposito = entry({ type: 'cash', goalId: 'g1' });
    expect(isEntryOutflow(deposito)).toBe(true);
    expect(isEntryInflow(deposito)).toBe(false);
  });

  it('saque da meta (debt + goalId) é entrada do caixa', () => {
    const saque = entry({ type: 'debt', goalId: 'g1' });
    expect(isEntryInflow(saque)).toBe(true);
    expect(isEntryOutflow(saque)).toBe(false);
  });
});
