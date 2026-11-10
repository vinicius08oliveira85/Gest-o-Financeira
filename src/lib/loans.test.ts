import { describe, it, expect } from 'vitest';
import {
  addMonthsISO,
  buildInstallments,
  buildInstallmentsForPeriod,
  dateInMonth,
  formatDiscountPeriod,
  getDiscountPeriod,
  getEndingDiscounts,
  getLoanPaidAmount,
  getLoanTotals,
  getNextDueDate,
  isInstallmentLoan,
  monthsBetweenMonths,
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

describe('período do desconto', () => {
  it('conta os meses incluindo início e fim', () => {
    expect(monthsBetweenMonths('2026-11', '2027-01')).toBe(3);
    expect(monthsBetweenMonths('2026-11', '2027-11')).toBe(13);
    expect(monthsBetweenMonths('2027-01', '2026-12')).toBe(0);
  });

  it('ajusta o dia ao último dia do mês', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dateInMonth('2026-11', 10)).toBe('2026-11-10');
  });

  it('gera uma parcela por mês do período de desconto', () => {
    const installments = buildInstallmentsForPeriod(1000, '2026-11', '2027-01', 10);

    expect(installments).toHaveLength(3);
    expect(installments.map((i) => i.dueDate)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10']);
    expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBeCloseTo(1000, 2);
  });

  it('mostra o período registrado e deduz o das parcelas antigas', () => {
    const withPeriod = loan({ id: 'p', discountStart: '2026-11', discountEnd: '2027-01' });
    expect(getDiscountPeriod(withPeriod)).toEqual({ start: '2026-11', end: '2027-01' });
    expect(formatDiscountPeriod(withPeriod)).toBe('nov/2026 até jan/2027');

    const legacy = loan({
      id: 'l',
      installmentsCount: 2,
      installments: buildInstallments(100, 2, '2026-12-05'),
    });
    expect(formatDiscountPeriod(legacy)).toBe('dez/2026 até jan/2027');

    expect(formatDiscountPeriod(loan({ id: 'n' }))).toBeNull();
    expect(formatDiscountPeriod(loan({ id: 's', discountStart: '2026-11' }))).toBe(
      'nov/2026 em diante'
    );
  });
});

describe('getEndingDiscounts', () => {
  const today = '2026-11-10';

  it('lista só descontos com saldo que terminam nos próximos 2 meses', () => {
    const endingNow = loan({ id: 'agora', discountStart: '2026-11', discountEnd: '2026-11' });
    const nextMonth = loan({ id: 'proximo', discountStart: '2026-12', discountEnd: '2026-12' });
    const later = loan({ id: 'longe', discountStart: '2026-11', discountEnd: '2027-06' });
    const finished = loan({
      id: 'quitado',
      paid: true,
      discountStart: '2026-11',
      discountEnd: '2026-12',
    });
    const noPeriod = loan({ id: 'sem' });

    expect(
      getEndingDiscounts([endingNow, nextMonth, later, finished, noPeriod], today).map(
        (d) => d.loan.id
      )
    ).toEqual(['agora', 'proximo']);
  });

  it('considera o último mês das parcelas quando não há período registrado', () => {
    const legacy = loan({
      id: 'legado',
      installmentsCount: 2,
      installments: buildInstallments(200, 2, '2026-11-05'),
    });
    const discounts = getEndingDiscounts([legacy], today);

    expect(discounts).toHaveLength(1);
    expect(discounts[0].end).toBe('2026-12');
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
