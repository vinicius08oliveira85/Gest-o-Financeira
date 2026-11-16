import { useMemo } from 'react';
import type { CardExpense, CreditCard, Entry, FilterType, Goal, Loan } from '../types';
import {
  ALERT_CONCENTRATION_RATIO,
  CARD_LIMIT_ALERT_RATIO,
  GOAL_DEADLINE_ALERT_DAYS,
} from '../constants';
import { formatCurrency, parseDateLocal, todayLocalISO } from '../lib/format';
import { formatMonthLabel, getEndingDiscounts, getOpenAmount, monthKey } from '../lib/loans';

export type AlertType =
  | 'concentration'
  | 'due-soon'
  | 'goal-deadline'
  | 'card-invoice-due'
  | 'card-limit'
  | 'loan-discount-ending';

/**
 * Para onde o alerta leva quando o usuário clica nele: a aba certa e, quando
 * faz sentido, o contexto já aplicado (categoria, filtro, item). Sem isso a
 * ação caía na aba genérica e o usuário tinha que refazer o caminho.
 */
export type AlertTarget = {
  tab: 'lancamentos' | 'metas' | 'cartoes' | 'emprestimos';
  /** Filtro de tipo/status aplicado na aba de lançamentos. */
  filter?: FilterType;
  /** Categoria a destacar e filtrar na lista. */
  category?: string;
  goalId?: string;
  cardId?: string;
  loanId?: string;
};

export type Alert = {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  target?: AlertTarget;
};

type UseAlertsParams = {
  entries: Entry[];
  month: number;
  year: number;
  goals?: Goal[];
  cards?: CreditCard[];
  cardExpenses?: CardExpense[];
  loans?: Loan[];
};

export function useAlerts({
  entries,
  month,
  year,
  goals = [],
  cards = [],
  cardExpenses = [],
  loans = [],
}: UseAlertsParams) {
  const alerts = useMemo<Alert[]>(() => {
    const byPeriod = entries.filter((d) => {
      const date = parseDateLocal(d.dueDate);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const result: Alert[] = [];

    // Mesma inversão de metas do resto do app: depósito na meta (cash+goalId)
    // abate do caixa → conta como saída; saque da meta (debt+goalId) → entrada.
    const isSaida = (d: Entry) => (d.goalId ? d.type === 'cash' : d.type === 'debt');

    // Concentração de gastos por categoria (somente saídas, com inversão de metas)
    const totalSaidas = byPeriod.filter((d) => isSaida(d)).reduce((acc, d) => acc + d.amount, 0);

    if (totalSaidas > 0) {
      const byCategory = byPeriod.reduce<Record<string, number>>((acc, d) => {
        if (!isSaida(d) || !d.category) return acc;
        acc[d.category] = (acc[d.category] ?? 0) + d.amount;
        return acc;
      }, {});

      Object.entries(byCategory).forEach(([category, value]) => {
        const ratio = value / totalSaidas;
        if (ratio >= ALERT_CONCENTRATION_RATIO) {
          result.push({
            id: `concentration-${category}-${month}-${year}`,
            type: 'concentration',
            title: `Muitos gastos em "${category}"`,
            description:
              'Essa categoria representa uma parte relevante das saídas do mês. Vale a pena revisar se todos os gastos são realmente necessários.',
            target: { tab: 'lancamentos', filter: 'debt', category },
          });
        }
      });
    }

    // Vencimentos próximos (próximos 5 dias, não pagos) — varre todos os
    // lançamentos, não só o mês visível (consistente com o alerta de fatura).
    const todayISO = todayLocalISO();
    const n = new Date();
    n.setDate(n.getDate() + 5);
    const fiveDaysISO = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;

    const dueSoon = entries.filter((d) => {
      if (!isSaida(d) || d.isPaid) return false;
      return d.dueDate >= todayISO && d.dueDate <= fiveDaysISO;
    });

    if (dueSoon.length > 0) {
      result.push({
        id: `due-soon-${month}-${year}`,
        type: 'due-soon',
        title: 'Lançamentos com vencimento próximo',
        description:
          'Você tem despesas a vencer nos próximos dias que ainda não foram marcadas como pagas.',
        target: { tab: 'lancamentos', filter: 'pending' },
      });
    }

    // Empréstimos cujo período de desconto termina no mês atual ou no seguinte
    for (const { loan, end } of getEndingDiscounts(loans, todayISO, 2)) {
      const lastMonth = end === monthKey(todayISO);
      result.push({
        id: `loan-discount-${loan.id}-${end}`,
        type: 'loan-discount-ending',
        title: lastMonth
          ? `Empréstimo "${loan.name}": último mês de desconto`
          : `Empréstimo "${loan.name}": desconto termina em ${formatMonthLabel(end)}`,
        description: `Ainda faltam ${formatCurrency(getOpenAmount(loan))} para quitar${
          lastMonth ? ' e este é o último mês de desconto.' : ' antes do desconto acabar.'
        }`,
        target: { tab: 'emprestimos', loanId: loan.id },
      });
    }

    // Metas com data alvo próxima ou já passada
    const todayStart = new Date(todayISO + 'T00:00:00');
    for (const goal of goals) {
      if (!goal.targetDate) continue;
      const target = parseDateLocal(goal.targetDate);
      target.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - todayStart.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays < 0) {
        result.push({
          id: `goal-deadline-${goal.id}`,
          type: 'goal-deadline',
          title: `Meta "${goal.name}": data alvo passou`,
          description: `A data para atingir esta meta já passou. Ajuste a meta ou a data se necessário.`,
          target: { tab: 'metas', goalId: goal.id },
        });
      } else if (diffDays === 0) {
        result.push({
          id: `goal-deadline-${goal.id}`,
          type: 'goal-deadline',
          title: `Meta "${goal.name}": vence hoje`,
          description: `A data alvo desta meta é hoje. Confira seu progresso.`,
          target: { tab: 'metas', goalId: goal.id },
        });
      } else if (diffDays <= GOAL_DEADLINE_ALERT_DAYS) {
        result.push({
          id: `goal-deadline-${goal.id}`,
          type: 'goal-deadline',
          title: `Meta "${goal.name}": faltam ${diffDays} dias`,
          description: `A data alvo desta meta é em ${diffDays} dia(s). Confira seu progresso.`,
          target: { tab: 'metas', goalId: goal.id },
        });
      }
    }

    // Alertas de cartão de crédito
    const todayD = new Date(todayISO + 'T00:00:00');
    const fiveDaysD = new Date(todayD);
    fiveDaysD.setDate(fiveDaysD.getDate() + 5);

    for (const entry of entries) {
      if (!entry.isCardInvoice || entry.isPaid) continue;
      const payDue = entry.invoicePaymentDueDate ?? entry.dueDate;
      const dueD = parseDateLocal(payDue);
      dueD.setHours(0, 0, 0, 0);
      const diffMs = dueD.getTime() - todayD.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays >= 0 && dueD <= fiveDaysD) {
        result.push({
          id: `card-invoice-due-${entry.id}`,
          type: 'card-invoice-due',
          title: `Fatura "${entry.name}" vence em breve`,
          description:
            diffDays === 0
              ? 'Esta fatura de cartão vence hoje e ainda não foi paga.'
              : `Esta fatura de cartão vence em ${diffDays} dia(s). Não esqueça de pagar.`,
          target: { tab: 'cartoes', cardId: entry.cardId },
        });
      }
    }

    // Alertas de limite do cartão
    for (const card of cards) {
      const totalUsed = cardExpenses
        .filter((e) => e.cardId === card.id && e.billingMonth === month && e.billingYear === year)
        .reduce((sum, e) => sum + e.amount, 0);
      const ratio = card.limitAmount > 0 ? totalUsed / card.limitAmount : 0;
      if (ratio >= CARD_LIMIT_ALERT_RATIO) {
        result.push({
          id: `card-limit-${card.id}-${month}-${year}`,
          type: 'card-limit',
          title: `Cartão "${card.name}" acima de ${Math.round(CARD_LIMIT_ALERT_RATIO * 100)}% do limite`,
          description: `Você usou ${(ratio * 100).toFixed(0)}% do limite do cartão ${card.name} neste mês.`,
          target: { tab: 'cartoes', cardId: card.id },
        });
      }
    }

    return result;
  }, [entries, month, year, goals, cards, cardExpenses, loans]);

  return { alerts };
}
