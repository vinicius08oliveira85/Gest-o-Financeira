import type { CardExpense, CreditCard, Entry } from '../types';
import { parseDateLocal } from './format';
import { copyDueDateForMonth } from './recurringEntries';
import { randomUUID } from './uuid';

/**
 * Determina a qual fatura (mês/ano) pertence uma compra, levando em conta o
 * dia de fechamento do cartão.
 *
 * Regra: se o dia da compra for > closingDay → vai para a fatura do mês seguinte.
 */
export function getBillingPeriod(
  purchaseDate: string,
  closingDay: number
): { month: number; year: number } {
  const d = parseDateLocal(purchaseDate);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  if (day > closingDay) {
    // Vai para a fatura do próximo mês
    const next = new Date(year, month + 1, 1);
    return { month: next.getMonth(), year: next.getFullYear() };
  }
  return { month, year };
}

/**
 * Data de fechamento da fatura no ciclo (closingDay do mês de cobrança).
 * Usada como dueDate do lançamento para aparecer no mês correto do fluxo.
 */
export function getInvoiceClosingDate(
  billingMonth: number,
  billingYear: number,
  closingDay: number
): string {
  const lastDay = new Date(billingYear, billingMonth + 1, 0).getDate();
  const safeDay = Math.min(closingDay, lastDay);
  const d = new Date(billingYear, billingMonth, safeDay);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Calcula a data de vencimento da fatura.
 * A fatura do ciclo billingMonth/billingYear vence no dueDay do mês seguinte.
 */
export function getInvoiceDueDate(
  billingMonth: number,
  billingYear: number,
  dueDay: number
): string {
  // Vencimento ocorre no mês seguinte ao ciclo de cobrança
  const dueDate = new Date(billingYear, billingMonth + 1, 1);
  const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(dueDay, lastDay);
  const d = new Date(dueDate.getFullYear(), dueDate.getMonth(), safeDay);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Encontra o lançamento de fatura (isCardInvoice) já registrado no fluxo para o
 * ciclo billingMonth/billingYear do cartão, usando o fechamento ou o vencimento
 * como chave (faturas antigas sem invoicePaymentDueDate usam o vencimento no dueDate).
 */
export function findInvoiceEntryForCycle(
  entries: Entry[],
  cardId: string,
  billingMonth: number,
  billingYear: number,
  closingDay: number,
  dueDay: number
): Entry | undefined {
  const closingIso = getInvoiceClosingDate(billingMonth, billingYear, closingDay);
  const paymentIso = getInvoiceDueDate(billingMonth, billingYear, dueDay);
  return entries.find(
    (e) =>
      e.isCardInvoice &&
      e.cardId === cardId &&
      (e.dueDate === closingIso ||
        e.invoicePaymentDueDate === paymentIso ||
        (!e.invoicePaymentDueDate && e.dueDate === paymentIso))
  );
}

/**
 * Constrói um lançamento do tipo debt representando uma fatura de cartão.
 * Se existingId for fornecido, reutiliza o mesmo id (para atualização).
 */
export function buildInvoiceEntry(
  card: CreditCard,
  billingMonth: number,
  billingYear: number,
  total: number,
  existingId?: string
): Entry {
  const monthName = new Date(billingYear, billingMonth).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const now = Date.now();
  const closingDate = getInvoiceClosingDate(billingMonth, billingYear, card.closingDay);
  const paymentDue = getInvoiceDueDate(billingMonth, billingYear, card.dueDay);
  return {
    id: existingId ?? randomUUID(),
    name: `Fatura ${card.name} — ${monthName}`,
    amount: total,
    dueDate: closingDate,
    invoicePaymentDueDate: paymentDue,
    isPaid: false,
    type: 'debt',
    createdAt: now,
    updatedAt: now,
    category: 'Cartão de crédito',
    tag: card.name,
    cardId: card.id,
    isCardInvoice: true,
  };
}

export type CardExpenseInstallmentInput = {
  cardId: string;
  name: string;
  totalAmount: number;
  date: string;
  closingDay: number;
  count: number;
  category?: string;
  tag?: string;
  parentId?: string;
};

/**
 * Gera as parcelas de um gasto de cartão.
 *
 * Usa aritmética de datas LOCAL (parseDateLocal + copyDueDateForMonth), evitando
 * dois problemas do `new Date(date)` + `toISOString()`:
 *  - deslocamento de fuso horário (no Brasil, UTC-3, a data podia "voltar" um dia);
 *  - "vazamento" do dia 31 em meses curtos (31/01 + 1 mês virava 03/03).
 * Cada parcela cai na fatura (billingMonth/billingYear) do mês correto.
 */
export function buildInstallmentCardExpenses(
  input: CardExpenseInstallmentInput
): Array<Omit<CardExpense, 'id' | 'createdAt'>> {
  const { cardId, name, totalAmount, date, closingDay, count, category, tag, parentId } = input;
  const safeCount = Math.max(1, Math.floor(count));
  const installmentAmount = safeCount > 1 ? totalAmount / safeCount : totalAmount;
  const base = parseDateLocal(date);

  const rows: Array<Omit<CardExpense, 'id' | 'createdAt'>> = [];
  for (let i = 0; i < safeCount; i++) {
    const targetMonth = base.getMonth() + i;
    const targetYear = base.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const dueDate = copyDueDateForMonth(date, normalizedMonth, targetYear);
    const billing = getBillingPeriod(dueDate, closingDay);
    rows.push({
      cardId,
      name,
      amount: installmentAmount,
      date: dueDate,
      billingMonth: billing.month,
      billingYear: billing.year,
      category,
      tag,
      installmentsCount: safeCount > 1 ? safeCount : undefined,
      installmentNumber: safeCount > 1 ? i + 1 : undefined,
      parentInstallmentId: parentId,
    });
  }
  return rows;
}
