import type { CreditCard, Entry } from '../types';
import { parseDateLocal } from './format';

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
    id: existingId ?? crypto.randomUUID(),
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
