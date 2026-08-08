import { describe, it, expect } from 'vitest';
import {
  getInvoiceClosingDate,
  getInvoiceDueDate,
  buildInvoiceEntry,
  buildInstallmentCardExpenses,
} from './cardInvoice';
import type { CreditCard } from '../types';

const card: CreditCard = {
  id: 'c1',
  name: 'Visa',
  limitAmount: 5000,
  closingDay: 25,
  dueDay: 5,
};

describe('getInvoiceClosingDate', () => {
  it('retorna o dia de fechamento no mês de cobrança', () => {
    expect(getInvoiceClosingDate(2, 2025, 25)).toBe('2025-03-25');
  });

  it('ajusta quando o dia não existe no mês', () => {
    expect(getInvoiceClosingDate(1, 2025, 31)).toBe('2025-02-28');
  });
});

describe('getInvoiceDueDate', () => {
  it('vence no mês seguinte ao ciclo', () => {
    expect(getInvoiceDueDate(2, 2025, 5)).toBe('2025-04-05');
  });
});

describe('buildInvoiceEntry', () => {
  it('usa data de fechamento em dueDate e vencimento em invoicePaymentDueDate', () => {
    const e = buildInvoiceEntry(card, 2, 2025, 1200);
    expect(e.dueDate).toBe('2025-03-25');
    expect(e.invoicePaymentDueDate).toBe('2025-04-05');
    expect(e.amount).toBe(1200);
    expect(e.isCardInvoice).toBe(true);
    expect(e.type).toBe('debt');
  });
});

describe('buildInstallmentCardExpenses', () => {
  const base = {
    cardId: 'c1',
    name: 'Notebook',
    totalAmount: 3000,
    date: '2026-01-15',
    closingDay: 25,
    count: 3,
    category: 'Tecnologia',
    tag: 'cartao',
    parentId: 'p1',
  };

  it('gera N parcelas com valores iguais, datas mensais e numeração', () => {
    const rows = buildInstallmentCardExpenses(base);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.amount)).toEqual([1000, 1000, 1000]);
    expect(rows.map((r) => r.date)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
    expect(rows.map((r) => r.installmentNumber)).toEqual([1, 2, 3]);
    expect(rows.every((r) => r.installmentsCount === 3)).toBe(true);
    expect(rows.every((r) => r.parentInstallmentId === 'p1')).toBe(true);
  });

  it('não "vaza" o dia 31 para meses curtos', () => {
    const rows = buildInstallmentCardExpenses({ ...base, date: '2026-01-31', count: 3 });
    expect(rows.map((r) => r.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('respeita ano bissexto (fevereiro/2024 tem 29 dias)', () => {
    const rows = buildInstallmentCardExpenses({ ...base, date: '2024-01-31', count: 2 });
    expect(rows.map((r) => r.date)).toEqual(['2024-01-31', '2024-02-29']);
  });

  it('faz a virada de ano em dezembro', () => {
    const rows = buildInstallmentCardExpenses({ ...base, date: '2026-12-10', count: 3 });
    expect(rows.map((r) => r.date)).toEqual(['2026-12-10', '2027-01-10', '2027-02-10']);
  });

  it('aloca cada parcela na fatura correta (compra após o fechamento vai para o mês seguinte)', () => {
    const rows = buildInstallmentCardExpenses({
      ...base,
      date: '2026-01-30',
      closingDay: 25,
      count: 2,
    });
    expect(rows[0].billingMonth).toBe(1); // fevereiro (0-indexado)
    expect(rows[0].billingYear).toBe(2026);
    expect(rows[1].billingMonth).toBe(2); // março
    expect(rows[1].billingYear).toBe(2026);
  });

  it('parcela única não marca installmentsCount/installmentNumber', () => {
    const rows = buildInstallmentCardExpenses({ ...base, count: 1, parentId: undefined });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(3000);
    expect(rows[0].installmentsCount).toBeUndefined();
    expect(rows[0].installmentNumber).toBeUndefined();
    expect(rows[0].parentInstallmentId).toBeUndefined();
  });
});
