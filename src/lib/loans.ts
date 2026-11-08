import type { Loan } from '../types';

export type LoanTotals = {
  open: number;
  overdue: number;
};

/**
 * Totais de empréstimos: `open` soma os não pagos; `overdue` soma os não pagos
 * com vencimento anterior a `today` (formato ISO yyyy-mm-dd).
 */
export function getLoanTotals(loans: Loan[], today: string): LoanTotals {
  let open = 0;
  let overdue = 0;
  for (const loan of loans) {
    if (loan.paid) continue;
    open += loan.amount;
    if (loan.dueDate < today) overdue += loan.amount;
  }
  return { open, overdue };
}
