import type { Loan, LoanInstallment } from '../types';

export type LoanTotals = {
  open: number;
  overdue: number;
};

/** Empréstimo parcelado (tem parcelas geradas). */
export function isInstallmentLoan(loan: Loan): boolean {
  return (loan.installmentsCount ?? 1) > 1 && (loan.installments?.length ?? 0) > 0;
}

/** Parcelas ainda em aberto (vazio quando o empréstimo é de pagamento único). */
export function getOpenInstallments(loan: Loan): LoanInstallment[] {
  return isInstallmentLoan(loan) ? loan.installments!.filter((i) => !i.paid) : [];
}

/** Valor já pago do empréstimo (parcelas pagas ou o valor total, se quitado). */
export function getLoanPaidAmount(loan: Loan): number {
  if (isInstallmentLoan(loan)) {
    return loan.installments!.filter((i) => i.paid).reduce((sum, i) => sum + i.amount, 0);
  }
  return loan.paid ? loan.amount : 0;
}

/**
 * Totais de empréstimos: `open` soma o que falta pagar; `overdue` soma o que
 * está em aberto com vencimento anterior a `today` (formato ISO yyyy-mm-dd).
 *
 * Em empréstimo parcelado cada parcela conta individualmente: um empréstimo com
 * 12 parcelas e 3 pagas só entra em aberto pelas 9 restantes.
 */
export function getLoanTotals(loans: Loan[], today: string): LoanTotals {
  let open = 0;
  let overdue = 0;
  for (const loan of loans) {
    if (isInstallmentLoan(loan)) {
      for (const installment of loan.installments!) {
        if (installment.paid) continue;
        open += installment.amount;
        if (installment.dueDate < today) overdue += installment.amount;
      }
      continue;
    }
    if (loan.paid) continue;
    open += loan.amount;
    if (loan.dueDate < today) overdue += loan.amount;
  }
  return { open, overdue };
}

/** Próximo vencimento em aberto (parcela ou empréstimo único). */
export function getNextDueDate(loan: Loan): string {
  if (isInstallmentLoan(loan)) {
    const open = getOpenInstallments(loan);
    if (open.length === 0) return loan.dueDate;
    return open.reduce((min, i) => (i.dueDate < min ? i.dueDate : min), open[0].dueDate);
  }
  return loan.dueDate;
}

/** Data ISO somando meses, ajustando o dia ao último dia do mês (ex.: 31/01 + 1 = 28/02). */
export function addMonthsISO(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const base = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(
    safeDay
  ).padStart(2, '0')}`;
}

const MONTH_LABELS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Mês (YYYY-MM) de uma data ISO. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Soma meses a um mês YYYY-MM. */
export function addMonthsToMonth(month: string, months: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const base = new Date(year, monthNumber - 1 + months, 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}

/** Meses do período contando o início e o fim (nov/2026 a jan/2027 = 3). */
export function monthsBetweenMonths(startMonth: string, endMonth: string): number {
  const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMonthNumber - startMonthNumber) + 1;
}

/** 'nov/2026' a partir de 'YYYY-MM'. */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_LABELS[monthNumber - 1]}/${year}`;
}

/** Data ISO do dia informado dentro do mês, ajustada ao último dia do mês. */
export function dateInMonth(month: string, day: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const safeDay = Math.max(1, Math.min(Math.trunc(day) || 1, lastDay));
  return `${month}-${String(safeDay).padStart(2, '0')}`;
}

/**
 * Gera as parcelas a partir do período do desconto: uma parcela por mês, do mês
 * de início ao mês de fim, todas vencendo no dia informado (ajustado em meses
 * mais curtos).
 */
export function buildInstallmentsForPeriod(
  total: number,
  startMonth: string,
  endMonth: string,
  day: number,
  previous: LoanInstallment[] = []
): LoanInstallment[] {
  const count = Math.max(1, monthsBetweenMonths(startMonth, endMonth));
  return buildInstallments(total, count, dateInMonth(startMonth, day), previous);
}

/**
 * Período do desconto do empréstimo: usa o registrado e, se não houver, deduz
 * das parcelas (do primeiro ao último vencimento).
 */
export function getDiscountPeriod(loan: Loan): { start: string; end?: string } | null {
  if (loan.discountStart) return { start: loan.discountStart, end: loan.discountEnd };
  if (isInstallmentLoan(loan)) {
    const dates = loan.installments!.map((i) => i.dueDate).sort();
    if (dates.length === 0) return null;
    return { start: monthKey(dates[0]), end: monthKey(dates[dates.length - 1]) };
  }
  return null;
}

/** Texto do período do desconto (ex.: 'nov/2026 até jan/2027'). */
export function formatDiscountPeriod(loan: Loan): string | null {
  const period = getDiscountPeriod(loan);
  if (!period) return null;
  if (!period.end || period.end === period.start) {
    return `${formatMonthLabel(period.start)} em diante`;
  }
  return `${formatMonthLabel(period.start)} até ${formatMonthLabel(period.end)}`;
}

/**
 * Gera as parcelas de um empréstimo: divide o total em centavos (a sobra vai para
 * as primeiras parcelas, então a soma fecha exatamente com o valor total) e
 * espaça os vencimentos de mês em mês a partir de `firstDueDate`.
 *
 * Parcelas já pagas em `previous` são mantidas como estão (valor, data e
 * lançamento vinculado): editar o empréstimo não pode desfazer pagamentos.
 */
export function buildInstallments(
  total: number,
  count: number,
  firstDueDate: string,
  previous: LoanInstallment[] = []
): LoanInstallment[] {
  const safeCount = Math.max(1, Math.min(Math.trunc(count), 120));
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / safeCount);
  const remainder = totalCents - baseCents * safeCount;

  return Array.from({ length: safeCount }, (_, index) => {
    const number = index + 1;
    const paidBefore = previous.find((p) => p.number === number && p.paid);
    if (paidBefore) return paidBefore;
    return {
      number,
      amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
      dueDate: addMonthsISO(firstDueDate, index),
      paid: false,
    };
  });
}
