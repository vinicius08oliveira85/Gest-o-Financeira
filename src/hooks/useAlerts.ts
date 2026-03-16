import { useMemo } from 'react';
import type { Entry } from '../types';
import { ALERT_CONCENTRATION_RATIO } from '../constants';

export type AlertType = 'concentration' | 'due-soon';

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
};

export function useAlerts({ entries, month, year }: UseAlertsParams) {
  const alerts = useMemo<Alert[]>(() => {
    const byPeriod = entries.filter((d) => {
      const date = new Date(d.dueDate);
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
    const today = new Date();
    const fiveDaysAhead = new Date();
    fiveDaysAhead.setDate(today.getDate() + 5);

    const dueSoon = byPeriod.filter((d) => {
      if (d.type !== 'debt' || d.isPaid) return false;
      const date = new Date(d.dueDate);
      return date >= today && date <= fiveDaysAhead;
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

    return result;
  }, [entries, month, year]);

  return { alerts };
}
