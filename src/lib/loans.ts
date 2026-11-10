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
