import { useMemo } from 'react';
import type { CardExpense, CreditCard, Entry, Goal } from '../types';
import {
  ALERT_CONCENTRATION_RATIO,
  CARD_LIMIT_ALERT_RATIO,
  GOAL_DEADLINE_ALERT_DAYS,
} from '../constants';
import { parseDateLocal, todayLocalISO } from '../lib/format';

export type AlertType =
  | 'concentration'
  | 'due-soon'
  | 'goal-deadline'
  | 'card-invoice-due'
  | 'card-limit';

export type Alert = {
  id: string;
  type: AlertType;
  title: string;
  description: string;
};

type UseAlertsParams = {
  entries: Entry[];
  month: number;
  year: number;
  goals?: Goal[];
  cards?: CreditCard[];
  cardExpenses?: CardExpense[];
};

export function useAlerts({
  entries,
  month,
  year,
  goals = [],
  cards = [],
  cardExpenses = [],
}: UseAlertsParams) {
  const alerts = useMemo<Alert[]>(() => {
    const byPeriod = entries.filter((d) => {
      const date = parseDateLocal(d.dueDate);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const result: Alert[] = [];

    // Concentração de gastos por categoria (somente saídas)
    const totalSaidas = byPeriod
      .filter((d) => d.type === 'debt')
      .reduce((acc, d) => acc + d.amount, 0);

    if (totalSaidas > 0) {
      const byCategory = byPeriod.reduce<Record<string, number>>((acc, d) => {
        if (d.type !== 'debt' || !d.category) return acc;
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
          });
        }
      });
    }

    // Vencimentos próximos (próximos 5 dias, não pagos)
    const todayISO = todayLocalISO();
    const n = new Date();
    n.setDate(n.getDate() + 5);
    const fiveDaysISO = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;

    const dueSoon = byPeriod.filter((d) => {
      if (d.type !== 'debt' || d.isPaid) return false;
      return d.dueDate >= todayISO && d.dueDate <= fiveDaysISO;
    });

    if (dueSoon.length > 0) {
      result.push({
        id: `due-soon-${month}-${year}`,
        type: 'due-soon',
        title: 'Lançamentos com vencimento próximo',
        description:
          'Você tem despesas a vencer nos próximos dias que ainda não foram marcadas como pagas.',
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
        });
      } else if (diffDays <= GOAL_DEADLINE_ALERT_DAYS) {
        result.push({
          id: `goal-deadline-${goal.id}`,
          type: 'goal-deadline',
          title: `Meta "${goal.name}": faltam ${diffDays} dias`,
          description: `A data alvo desta meta é em ${diffDays} dia(s). Confira seu progresso.`,
        });
      }
    }

    // Alertas de cartão de crédito
    const todayD = new Date(todayISO + 'T00:00:00');
    const fiveDaysD = new Date(todayD);
    fiveDaysD.setDate(fiveDaysD.getDate() + 5);

    for (const entry of entries) {
      if (!entry.isCardInvoice || entry.isPaid) continue;
      const dueD = parseDateLocal(entry.dueDate);
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
        });
      }
    }

    return result;
  }, [entries, month, year, goals, cards, cardExpenses]);

  return { alerts };
}
