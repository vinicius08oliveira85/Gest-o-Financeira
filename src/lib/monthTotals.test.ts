import { describe, it, expect } from 'vitest';
import type { Entry } from '../types';
import { addLoanPendingOutflow, getEntryTotals, getMonthTotals } from './monthTotals';

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

describe('getEntryTotals', () => {
  it('separa finalizados de pendentes e calcula o saldo só com finalizados', () => {
    const totals = getEntryTotals([
      entry({ id: '1', type: 'cash', amount: 1000, isPaid: true }),
      entry({ id: '2', type: 'debt', amount: 400, isPaid: true }),
      entry({ id: '3', type: 'debt', amount: 250, isPaid: false }),
    ]);

    expect(totals).toMatchObject({
      entradas: 1000,
      saidas: 650,
      saldo: 600,
      entradasFinalizadas: 1000,
      saidasFinalizadas: 400,
      entradasPendentes: 0,
      saidasPendentes: 250,
    });
  });

  it('aplica a inversão das metas: depósito é saída e saque é entrada', () => {
    const totals = getEntryTotals([
      entry({ id: '1', type: 'cash', amount: 300, isPaid: true, goalId: 'g1' }),
      entry({ id: '2', type: 'debt', amount: 120, isPaid: true, goalId: 'g1' }),
    ]);

    expect(totals).toMatchObject({ entradas: 120, saidas: 300, saldo: -180 });
  });
});

describe('getMonthTotals', () => {
  it('considera apenas o vencimento no mês/ano pedido', () => {
    const totals = getMonthTotals(
      [
        entry({ id: '1', amount: 100, dueDate: '2026-11-30' }),
        entry({ id: '2', amount: 900, dueDate: '2026-12-01' }),
        entry({ id: '3', amount: 50, dueDate: '2025-11-10' }),
      ],
      10,
      2026
    );
    expect(totals.saidas).toBe(100);
  });
});

describe('addLoanPendingOutflow', () => {
  it('soma a parcela em aberto às saídas e ao pendente sem mexer no saldo', () => {
    const base = {
      entradas: 1000,
      saidas: 200,
      saldo: 800,
      entradasFinalizadas: 1000,
      saidasFinalizadas: 200,
      entradasPendentes: 0,
      saidasPendentes: 0,
    };
    expect(addLoanPendingOutflow(base, 150)).toEqual({
      ...base,
      saidas: 350,
      saidasPendentes: 150,
    });
  });

  it('sem parcela pendente devolve o mesmo objeto', () => {
    const base = {
      entradas: 0,
      saidas: 0,
      saldo: 0,
      entradasFinalizadas: 0,
      saidasFinalizadas: 0,
      entradasPendentes: 0,
      saidasPendentes: 0,
    };
    expect(addLoanPendingOutflow(base, 0)).toBe(base);
  });
});
