import { describe, it, expect } from 'vitest';
import { averageCardUsage, buildMonthlyTrend } from './monthlyTrend';
import type { CardExpense, CreditCard, Entry } from '../types';

function entry(
  id: string,
  type: Entry['type'],
  amount: number,
  dueDate: string,
  isPaid: boolean,
  goalId?: string
): Entry {
  return {
    id,
    name: 'Item',
    amount,
    dueDate,
    isPaid,
    type,
    createdAt: Date.now(),
    goalId,
  };
}

function cardExpense(
  id: string,
  amount: number,
  billingMonth: number,
  billingYear: number
): CardExpense {
  return {
    id,
    cardId: 'card-1',
    name: 'Compra',
    amount,
    date: '2025-03-01',
    billingMonth,
    billingYear,
    createdAt: Date.now(),
  };
}

function card(id: string, limitAmount: number, createdAt?: string): CreditCard {
  return {
    id,
    name: 'Cartão',
    limitAmount,
    closingDay: 25,
    dueDay: 5,
    createdAt,
  };
}

describe('buildMonthlyTrend', () => {
  it('monta a janela de meses terminando no mês visível (mais antigo → atual)', () => {
    const entries: Entry[] = [entry('1', 'cash', 100, '2025-03-10', true)];
    const trend = buildMonthlyTrend(entries, 2, 2025, 3);

    expect(trend).toHaveLength(3);
    expect(trend[0]).toMatchObject({ month: 0, year: 2025 });
    expect(trend[1]).toMatchObject({ month: 1, year: 2025 });
    expect(trend[2]).toMatchObject({ month: 2, year: 2025, entradas: 100 });
  });

  it('aplica a inversão de metas (depósito = saída, saque = entrada)', () => {
    const entries: Entry[] = [
      entry('1', 'cash', 300, '2025-03-05', false, 'g1'), // depósito na meta → saída
      entry('2', 'debt', 150, '2025-03-12', false, 'g1'), // saque da meta → entrada
      entry('3', 'cash', 200, '2025-03-20', false), // entrada normal
      entry('4', 'debt', 50, '2025-03-22', false), // saída normal
    ];

    const trend = buildMonthlyTrend(entries, 2, 2025, 1);

    expect(trend[0].entradas).toBe(150 + 200);
    expect(trend[0].saidas).toBe(300 + 50);
  });

  it('saldo considera apenas lançamentos finalizados', () => {
    const entries: Entry[] = [
      entry('1', 'cash', 1000, '2025-03-01', true),
      entry('2', 'debt', 400, '2025-03-10', true),
      entry('3', 'debt', 200, '2025-03-15', false), // pendente não entra no saldo
    ];

    const trend = buildMonthlyTrend(entries, 2, 2025, 1);

    expect(trend[0].saldo).toBe(1000 - 400);
    expect(trend[0].saidas).toBe(400 + 200); // mas entra no total de saídas
  });

  it('cruza o limite do ano (dezembro → janeiro)', () => {
    const entries: Entry[] = [entry('1', 'cash', 500, '2024-12-05', true)];

    const trend = buildMonthlyTrend(entries, 0, 2025, 3);

    expect(trend).toHaveLength(3);
    expect(trend[0]).toMatchObject({ month: 10, year: 2024 });
    expect(trend[1]).toMatchObject({ month: 11, year: 2024, entradas: 500 });
    expect(trend[2]).toMatchObject({ month: 0, year: 2025 });
  });

  it('sem lançamentos retorna todos os meses zerados', () => {
    const trend = buildMonthlyTrend([], 5, 2025, 6);

    expect(trend).toHaveLength(6);
    expect(trend.every((p) => p.entradas === 0 && p.saidas === 0 && p.saldo === 0)).toBe(true);
  });

  it('rótulo do mês vem em pt-BR sem ponto final', () => {
    const trend = buildMonthlyTrend([], 2, 2025, 1);

    expect(trend[0].label).toBe('mar');
  });

  it('soma os gastos do cartão pelo mês da fatura', () => {
    const expenses = [
      cardExpense('c1', 300, 2, 2025),
      cardExpense('c2', 120.5, 2, 2025),
      cardExpense('c3', 999, 1, 2025), // mês anterior da fatura
    ];

    const trend = buildMonthlyTrend([], 2, 2025, 2, expenses);

    expect(trend[0].cardSpending).toBe(999);
    expect(trend[1].cardSpending).toBe(300 + 120.5);
  });

  it('cardSpending fica zerado quando não há despesas de cartão', () => {
    const trend = buildMonthlyTrend([], 2, 2025, 3);

    expect(trend.every((p) => p.cardSpending === 0)).toBe(true);
  });

  it('cardLimit soma os limites dos cartões em todos os meses (sem createdAt)', () => {
    const cards = [card('c1', 1000), card('c2', 2500.5)];

    const trend = buildMonthlyTrend([], 2, 2025, 3, [], cards);

    expect(trend.every((p) => p.cardLimit === 3500.5)).toBe(true);
  });

  it('cardLimits lista cada cartão vigente com id, nome, cor e limite', () => {
    const cards = [
      { ...card('c1', 1000), name: 'Nubank', color: '#7c3aed' },
      { ...card('c2', 2500.5), name: 'Inter' },
    ];

    const trend = buildMonthlyTrend([], 2, 2025, 1, [], cards);

    expect(trend[0].cardLimits).toEqual([
      { cardId: 'c1', name: 'Nubank', color: '#7c3aed', limit: 1000 },
      { cardId: 'c2', name: 'Inter', color: undefined, limit: 2500.5 },
    ]);
  });

  it('cardLimit e cardLimits respeitam a data de criação do cartão', () => {
    const cards = [
      card('c1', 1000, '2025-01-10T00:00:00Z'),
      card('c2', 2000, '2025-02-10T00:00:00Z'),
    ];

    const trend = buildMonthlyTrend([], 2, 2025, 3, [], cards);

    expect(trend[0].cardLimit).toBe(1000); // jan: só o cartão de janeiro
    expect(trend[0].cardLimits.map((c) => c.cardId)).toEqual(['c1']);
    expect(trend[1].cardLimit).toBe(3000); // fev: os dois
    expect(trend[1].cardLimits.map((c) => c.cardId)).toEqual(['c1', 'c2']);
    expect(trend[2].cardLimit).toBe(3000); // mar: os dois
  });

  it('cardLimit fica zerado quando não há cartões', () => {
    const trend = buildMonthlyTrend([], 2, 2025, 3);

    expect(trend.every((p) => p.cardLimit === 0)).toBe(true);
  });

  it('cardUsage é o percentual de uso do limite (gasto ÷ limite)', () => {
    const expenses = [
      cardExpense('c1', 250, 2, 2025),
      cardExpense('c2', 250, 2, 2025), // total 500
    ];
    const cards = [
      card('c1', 1000, '2025-01-10T00:00:00Z'),
      card('c2', 1000, '2025-01-10T00:00:00Z'), // limite total 2000
    ];

    const trend = buildMonthlyTrend([], 2, 2025, 1, expenses, cards);

    expect(trend[0].cardUsage).toBeCloseTo(25);
  });

  it('cardUsage fica null quando não há limite no mês', () => {
    const expenses = [cardExpense('c1', 100, 2, 2025)];

    const trend = buildMonthlyTrend([], 2, 2025, 1, expenses);

    expect(trend[0].cardUsage).toBeNull();
  });

  it('cardUsage pode passar de 100% (gasto acima do limite)', () => {
    const expenses = [cardExpense('c1', 1500, 2, 2025)];
    const cards = [card('c1', 1000, '2025-01-10T00:00:00Z')];

    const trend = buildMonthlyTrend([], 2, 2025, 1, expenses, cards);

    expect(trend[0].cardUsage).toBe(150);
  });

  it('averageCardUsage faz a média do uso dos meses com limite (ignora meses sem limite)', () => {
    const expenses = [cardExpense('c1', 75, 1, 2025)]; // fev
    const cards = [card('c1', 1000, '2025-02-01T00:00:00Z')]; // sem limite em jan

    const trend = buildMonthlyTrend([], 2, 2025, 3, expenses, cards);

    // jan: null; fev: 7,5%; mar: 0% → média (7,5 + 0) / 2 = 3,75
    expect(trend.map((p) => p.cardUsage)).toEqual([null, 7.5, 0]);
    expect(averageCardUsage(trend)).toBeCloseTo(3.75);
  });

  it('averageCardUsage retorna null quando nenhum mês tem limite', () => {
    const trend = buildMonthlyTrend([], 2, 2025, 3);

    expect(trend.every((p) => p.cardUsage === null)).toBe(true);
    expect(averageCardUsage(trend)).toBeNull();
  });
});
