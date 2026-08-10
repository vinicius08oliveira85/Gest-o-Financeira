import type { CardExpense, CreditCard, Entry } from '../types';
import { escapeCsvCell, parseDateLocal } from './format';

export type CardLimitPoint = {
  cardId: string;
  name: string;
  color?: string;
  /** Limite do cartão no mês */
  limit: number;
  /** Gasto do cartão no mês da fatura (para o uso individual por cartão) */
  spending: number;
};

export type MonthTrendPoint = {
  /** 0-11 */
  month: number;
  /** Ano completo */
  year: number;
  /** Rótulo curto do mês (pt-BR, sem ponto), ex.: "mar" */
  label: string;
  entradas: number;
  saidas: number;
  /** Saldo considerando apenas lançamentos finalizados (mesma regra do card Saldo) */
  saldo: number;
  /** Gastos no cartão de crédito do ciclo (soma das faturas do mês) */
  cardSpending: number;
  /** Limite total dos cartões vigentes no mês (soma de cardLimits) */
  cardLimit: number;
  /** Percentual de uso do limite no mês (cardSpending / cardLimit · 100); null quando não há limite */
  cardUsage: number | null;
  /** Limite de cada cartão vigente no mês (cartão criado depois do mês não aparece) */
  cardLimits: CardLimitPoint[];
};

/**
 * Agrega lançamentos por mês para a janela de `months` meses terminando no mês/ano
 * informados (o mês visível é o último ponto). Aplica a mesma inversão de metas
 * do resto do app: depósito na meta (cash+goalId) abate do caixa → conta como
 * saída; saque da meta (debt+goalId) volta → conta como entrada.
 *
 * `cardExpenses` entra como `cardSpending` por mês da fatura (billingMonth/Year);
 * `cards` entra como `cardLimit` (soma dos limites dos cartões já criados naquele mês).
 */
export function buildMonthlyTrend(
  entries: Entry[],
  currentMonth: number,
  currentYear: number,
  months = 6,
  cardExpenses: CardExpense[] = [],
  cards: CreditCard[] = []
): MonthTrendPoint[] {
  const isEntrada = (d: Entry) => (d.goalId ? d.type === 'debt' : d.type === 'cash');

  // Cartões vigentes em um mês (criados até lá). Sem `createdAt` (legado/migração),
  // o cartão conta em todos os meses.
  const cardsAt = (m: number, y: number) =>
    cards
      .filter((card) => {
        if (!card.createdAt) return true;
        const created = new Date(card.createdAt);
        if (Number.isNaN(created.getTime())) return true;
        return created.getFullYear() * 12 + created.getMonth() <= y * 12 + m;
      })
      .map((card) => ({
        cardId: card.id,
        name: card.name,
        color: card.color,
        limit: card.limitAmount,
        spending: cardExpenses
          .filter((c) => c.cardId === card.id && c.billingMonth === m && c.billingYear === y)
          .reduce((sum, c) => sum + c.amount, 0),
      }));

  const points: MonthTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    let entradas = 0;
    let saidas = 0;
    let saldo = 0;
    let cardSpending = 0;
    for (const e of entries) {
      const date = parseDateLocal(e.dueDate);
      if (date.getMonth() !== m || date.getFullYear() !== y) continue;
      if (isEntrada(e)) {
        entradas += e.amount;
        if (e.isPaid) saldo += e.amount;
      } else {
        saidas += e.amount;
        if (e.isPaid) saldo -= e.amount;
      }
    }
    for (const c of cardExpenses) {
      if (c.billingMonth === m && c.billingYear === y) cardSpending += c.amount;
    }

    const cardLimits = cardsAt(m, y);
    const cardLimit = cardLimits.reduce((sum, c) => sum + c.limit, 0);

    points.push({
      month: m,
      year: y,
      label: new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace(/\.$/, ''),
      entradas,
      saidas,
      saldo,
      cardSpending,
      cardLimit,
      cardUsage: cardLimit > 0 ? (cardSpending / cardLimit) * 100 : null,
      cardLimits,
    });
  }
  return points;
}

/**
 * Média do percentual de uso do limite na janela (cardUsage por mês),
 * considerando apenas meses com limite cadastrado (meses sem limite não
 * puxam a média para baixo). Retorna null quando nenhum mês tem limite.
 */
export function averageCardUsage(points: MonthTrendPoint[]): number | null {
  const withLimit = points.filter((p) => p.cardUsage !== null);
  if (withLimit.length === 0) return null;
  return withLimit.reduce((sum, p) => sum + (p.cardUsage ?? 0), 0) / withLimit.length;
}

/**
 * Gera o CSV da evolução mensal (mesmo formato da exportação de lançamentos:
 * separador vírgula, BOM UTF-8, células escapadas contra injeção de fórmula).
 */
export function buildTrendCsv(points: MonthTrendPoint[]): string {
  const headers = ['Mês', 'Entradas', 'Saídas', 'Cartão', 'Limite', 'Uso %', 'Saldo'];
  const rows = points.map((p) => [
    `${p.label}/${String(p.year).slice(2)}`,
    p.entradas.toString(),
    p.saidas.toString(),
    p.cardSpending.toString(),
    p.cardLimit.toString(),
    p.cardUsage === null ? '' : p.cardUsage.toFixed(1),
    p.saldo.toString(),
  ]);
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  return '\uFEFF' + csvLines.join('\n');
}
