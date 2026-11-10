import { describe, it, expect } from 'vitest';
import {
  addMonthsISO,
  buildInstallments,
  getLoanPaidAmount,
  getLoanTotals,
  getNextDueDate,
  isInstallmentLoan,
} from './loans';
import type { Loan } from '../types';

function loan(overrides: Partial<Loan> & { id: string }): Loan {
  return {
    name: 'Empréstimo',
    amount: 1000,
    sourceType: 'pessoa_fisica',
    dueDate: '2026-11-10',
    paid: false,
    createdAt: 1,
    ...overrides,
  };
}

describe('addMonthsISO', () => {
  it('avança mês a mês mantendo o dia', () => {
    expect(addMonthsISO('2026-11-10', 2)).toBe('2027-01-10');
  });

  it('ajusta para o último dia do mês quando o dia não existe', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('buildInstallments', () => {
  it('divide o total sem perder centavos e vence mês a mês', () => {
    const installments = buildInstallments(1000, 3, '2026-11-10');

    expect(installments.map((i) => i.amount)).toEqual([333.34, 333.33, 333.33]);
    expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBeCloseTo(1000, 2);
    expect(installments.map((i) => i.dueDate)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10']);
    expect(installments.every((i) => !i.paid)).toBe(true);
  });

  it('mantém parcelas já pagas ao editar o empréstimo', () => {
    const previous = buildInstallments(300, 3, '2026-11-10').map((i) =>
      i.number === 1 ? { ...i, paid: true, paidDate: '2026-11-10', entryId: 'e1' } : i
    );
    const rebuilt = buildInstallments(300, 3, '2027-01-15', previous);

    expect(rebuilt[0]).toMatchObject({ paid: true, entryId: 'e1', dueDate: '2026-11-10' });
    expect(rebuilt[1].paid).toBe(false);
    expect(rebuilt[1].dueDate).toBe('2027-02-15');
  });
});

describe('getLoanTotals com parcelas', () => {
  const installmentLoan = loan({
    id: 'parcelado',
    amount: 1000,
    dueDate: '2026-11-10',
    installmentsCount: 4,
    installments: buildInstallments(1000, 4, '2026-11-10').map((i) =>
      i.number <= 2 ? { ...i, paid: true, paidDate: '2026-11-10' } : i
    ),
  });

  it('considera só as parcelas em aberto', () => {
    expect(isInstallmentLoan(installmentLoan)).toBe(true);
    expect(getLoanTotals([installmentLoan], '2026-11-10')).toEqual({ open: 500, overdue: 0 });
  });

  it('marca como vencida apenas a parcela em aberto já vencida', () => {
    expect(getLoanTotals([installmentLoan], '2027-01-15')).toEqual({ open: 500, overdue: 250 });
  });

  it('o já pago soma as parcelas quitadas', () => {
    expect(getLoanPaidAmount(installmentLoan)).toBe(500);
  });

  it('o próximo vencimento é o da primeira parcela em aberto', () => {
    expect(getNextDueDate(installmentLoan)).toBe('2027-01-10');
  });

  it('empréstimo único continua somando o valor inteiro', () => {
    const single = loan({ id: 'unico', amount: 400, dueDate: '2026-11-01' });
    expect(getLoanTotals([single], '2026-11-10')).toEqual({ open: 400, overdue: 400 });
    expect(getLoanPaidAmount(single)).toBe(0);
  });
});
