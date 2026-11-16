import type { Entry } from '../types';
import { parseDateLocal } from './format';
import { isEntryInflow, isEntryOutflow } from './entryClassification';

/**
 * Totais de um conjunto de lançamentos, com a mesma classificação usada em
 * todas as telas (inversão das metas) e a mesma regra de saldo:
 *  - `entradas`/`saidas` somam tudo, finalizado ou não;
 *  - `saldo` considera apenas lançamentos finalizados.
 *
 * Antes essa conta vivia copiada em `useEntries`, `ReportsPanel` e no
 * comparativo de `CashFlowSection`. Três cópias = três chances de divergir.
 */
export type EntryTotals = {
  entradas: number;
  saidas: number;
  saldo: number;
  entradasFinalizadas: number;
  saidasFinalizadas: number;
  entradasPendentes: number;
  saidasPendentes: number;
};

export function getEntryTotals(entries: Entry[]): EntryTotals {
  const totals: EntryTotals = {
    entradas: 0,
    saidas: 0,
    saldo: 0,
    entradasFinalizadas: 0,
    saidasFinalizadas: 0,
    entradasPendentes: 0,
    saidasPendentes: 0,
  };

  for (const entry of entries) {
    const inflow = isEntryInflow(entry);
    if (inflow) {
      totals.entradas += entry.amount;
      if (entry.isPaid) {
        totals.entradasFinalizadas += entry.amount;
        totals.saldo += entry.amount;
      } else {
        totals.entradasPendentes += entry.amount;
      }
    } else if (isEntryOutflow(entry)) {
      totals.saidas += entry.amount;
      if (entry.isPaid) {
        totals.saidasFinalizadas += entry.amount;
        totals.saldo -= entry.amount;
      } else {
        totals.saidasPendentes += entry.amount;
      }
    }
  }

  return totals;
}

/** Totais dos lançamentos cujo vencimento cai no mês/ano informado. */
export function getMonthTotals(entries: Entry[], month: number, year: number): EntryTotals {
  const monthEntries = entries.filter((entry) => {
    const date = parseDateLocal(entry.dueDate);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  return getEntryTotals(monthEntries);
}

/**
 * Parcelas de empréstimo em aberto no mês são saída do mês (as pagas já são
 * lançamentos). Soma ao total e ao pendente, sem tocar no saldo — que só usa
 * dinheiro efetivamente movimentado.
 */
export function addLoanPendingOutflow(totals: EntryTotals, pendingAmount: number): EntryTotals {
  if (pendingAmount <= 0) return totals;
  return {
    ...totals,
    saidas: totals.saidas + pendingAmount,
    saidasPendentes: totals.saidasPendentes + pendingAmount,
  };
}
