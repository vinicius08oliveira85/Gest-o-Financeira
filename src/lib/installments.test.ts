import { describe, it, expect } from 'vitest';
import { generateInstallmentEntries, propagateInstallmentUpdate } from './installments';
import type { CardExpense } from '../types';

describe('generateInstallmentEntries', () => {
  it('gera N parcelas com datas mensais, grupo compartilhado e numeração', () => {
    const entries = generateInstallmentEntries({
      name: 'Curso',
      amountPerInstallment: 100,
      firstDueDate: '2026-01-15',
      type: 'debt',
      count: 3,
    });

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.dueDate)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
    expect(entries[0].parentInstallmentId).toBe(entries[1].parentInstallmentId);
    expect(entries[1].parentInstallmentId).toBe(entries[2].parentInstallmentId);
    expect(entries.map((e) => e.installmentNumber)).toEqual([1, 2, 3]);
    expect(entries.every((e) => e.installmentsCount === 3)).toBe(true);
    expect(entries.every((e) => e.amount === 100)).toBe(true);
  });

  it('atravessa anos e limita o dia ao fim do mês', () => {
    const entries = generateInstallmentEntries({
      name: 'Assinatura',
      amountPerInstallment: 50,
      firstDueDate: '2026-11-30',
      type: 'cash',
      count: 4,
    });

    expect(entries.map((e) => e.dueDate)).toEqual([
      '2026-11-30',
      '2026-12-30',
      '2027-01-30',
      '2027-02-28',
    ]);
  });
});

function expense(
  id: string,
  group: string | undefined,
  amount: number,
  installmentNumber?: number
): CardExpense {
  return {
    id,
    cardId: 'c1',
    name: 'Item',
    amount,
    date: '2026-01-10',
    billingMonth: 0,
    billingYear: 2026,
    category: 'Alimentação',
    tag: 'tag-orig',
    installmentsCount: group ? 3 : undefined,
    installmentNumber,
    parentInstallmentId: group,
    createdAt: 1,
  };
}

describe('propagateInstallmentUpdate', () => {
  it('propaga campos compartilhados para parcelas irmãs preservando data/fatura/nº', () => {
    const g = 'group-1';
    const list = [expense('a', g, 100, 1), expense('b', g, 100, 2), expense('c', g, 100, 3)];

    const updated: CardExpense = {
      ...expense('b', g, 100, 2),
      name: 'Nova descrição',
      amount: 150,
      tag: 'tag-novo',
    };
    const result = propagateInstallmentUpdate(list, updated);

    const a = result.find((e) => e.id === 'a');
    expect(a).toMatchObject({
      name: 'Nova descrição',
      amount: 150,
      tag: 'tag-novo',
      installmentNumber: 1,
      date: '2026-01-10',
      billingMonth: 0,
      billingYear: 2026,
    });
    expect(result.find((e) => e.id === 'b')).toMatchObject({ name: 'Nova descrição', amount: 150 });
    expect(result.find((e) => e.id === 'c')).toMatchObject({ name: 'Nova descrição', amount: 150 });
  });

  it('não altera lançamentos fora do grupo', () => {
    const g = 'group-1';
    const outside: CardExpense = expense('d', undefined, 999);
    const result = propagateInstallmentUpdate([expense('a', g, 100, 1), outside], {
      ...expense('a', g, 100, 1),
      name: 'Novo',
      amount: 111,
    });

    expect(result.find((e) => e.id === 'd')?.amount).toBe(999);
    expect(result.find((e) => e.id === 'd')?.name).toBe('Item');
  });

  it('sem parentInstallmentId, atualiza apenas o próprio registro', () => {
    const single = expense('x', undefined, 10);
    const other = expense('y', undefined, 20);
    const result = propagateInstallmentUpdate([single, other], { ...single, amount: 11 });

    expect(result).toHaveLength(2);
    expect(result.find((e) => e.id === 'x')?.amount).toBe(11);
    expect(result.find((e) => e.id === 'y')?.amount).toBe(20);
  });
});
