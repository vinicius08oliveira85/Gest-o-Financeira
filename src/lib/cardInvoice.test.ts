import { describe, it, expect } from 'vitest';
import { getInvoiceClosingDate, getInvoiceDueDate, buildInvoiceEntry } from './cardInvoice';
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
