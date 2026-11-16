import { describe, it, expect } from 'vitest';
import type { Entry } from '../types';
import { getMonthTotals } from './monthTotals';
import { buildMonthlyTrend } from './monthlyTrend';

/**
 * Guarda de consistência entre telas: o Resumo/Relatórios usam `getMonthTotals`
 * e o gráfico de evolução usa `buildMonthlyTrend`. Se as duas rotas divergirem
 * (foi o que aconteceu antes com a inversão das metas), este teste quebra.
 */
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

const entries: Entry[] = [
  entry({
    id: 'salario',
    name: 'Salário',
    type: 'cash',
    amount: 5000,
    isPaid: true,
    dueDate: '2026-11-05',
  }),
  entry({
    id: 'aluguel',
    name: 'Aluguel',
    type: 'debt',
    amount: 1500,
    isPaid: true,
    dueDate: '2026-11-10',
  }),
  entry({
    id: 'mercado',
    name: 'Mercado',
    type: 'debt',
    amount: 500,
    isPaid: false,
    dueDate: '2026-11-20',
  }),
  // Meta: depósito é saída do caixa, saque é entrada — invertido em relação ao type.
  entry({
    id: 'deposito',
    name: 'Depósito na meta',
    type: 'cash',
    amount: 300,
    isPaid: true,
    goalId: 'g1',
    dueDate: '2026-11-15',
  }),
  entry({
    id: 'saque',
    name: 'Saque da meta',
    type: 'debt',
    amount: 120,
    isPaid: true,
    goalId: 'g1',
    dueDate: '2026-11-18',
  }),
  // Fora do mês: não pode entrar em nenhum dos dois cálculos.
  entry({
    id: 'dez',
    name: 'Dezembro',
    type: 'debt',
    amount: 999,
    isPaid: true,
    dueDate: '2026-12-02',
  }),
];

describe('consistência Resumo/Relatórios x evolução mensal', () => {
  it('entradas, saídas e saldo do mês batem entre as duas rotas', () => {
    const totals = getMonthTotals(entries, 10, 2026);
    const trend = buildMonthlyTrend(entries, 10, 2026, 3);
    const last = trend[trend.length - 1];

    expect(last.entradas).toBe(totals.entradas);
    expect(last.saidas).toBe(totals.saidas);
    expect(last.saldo).toBe(totals.saldo);
  });

  it('a inversão das metas vale nas duas rotas (depósito é saída, saque é entrada)', () => {
    const totals = getMonthTotals(entries, 10, 2026);

    expect(totals.entradas).toBe(5120); // 5000 salário + 120 saque
    expect(totals.saidas).toBe(2300); // 1500 + 500 + 300 depósito
    expect(totals.saldo).toBe(3320); // (5000 + 120) - (1500 + 300)
  });
});
