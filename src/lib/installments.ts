import type { CardExpense, Entry, EntryType } from '../types';
import { parseDateLocal } from './format';
import { copyDueDateForMonth } from './recurringEntries';
import { randomUUID } from './uuid';

/**
 * Divide um total em `count` parcelas com centavos exatos: a soma das parcelas é
 * sempre igual ao total e o resto de centavos fica na primeira.
 *
 * Antes cada parcela era `total / count`, então 3x de R$ 100 gerava três
 * parcelas de R$ 33,33 — a soma ficava R$ 0,01 abaixo da compra, e um parcelado
 * de 7x podia ficar até R$ 0,06 fora do valor real.
 */
export function splitInstallments(totalAmount: number, count: number): number[] {
  const safeCount = Math.max(1, Math.floor(count));
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / safeCount);
  const remainder = totalCents - baseCents * safeCount;
  return Array.from({ length: safeCount }, (_, i) => (baseCents + (i === 0 ? remainder : 0)) / 100);
}

type BaseInstallmentInput = {
  name: string;
  /** Valor TOTAL do lançamento (é dividido entre as parcelas) */
  totalAmount: number;
  firstDueDate: string;
  type: EntryType;
  category?: string;
  tag?: string;
  count: number;
};

export function generateInstallmentEntries(input: BaseInstallmentInput): Entry[] {
  const { name, totalAmount, firstDueDate, type, category, tag, count } = input;

  const baseDate = parseDateLocal(firstDueDate);
  const createdAt = Date.now();
  const groupId = randomUUID();
  const amounts = splitInstallments(totalAmount, count);

  const entries: Entry[] = [];

  for (let i = 0; i < count; i++) {
    const targetMonth = baseDate.getMonth() + i;
    const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const dueDate = copyDueDateForMonth(firstDueDate, normalizedMonth, targetYear);

    const id = i === 0 ? groupId : randomUUID();

    entries.push({
      id,
      name,
      amount: amounts[i],
      dueDate,
      isPaid: false,
      type,
      createdAt,
      updatedAt: createdAt,
      category: category || undefined,
      tag: tag || undefined,
      installmentsCount: count,
      installmentNumber: i + 1,
      parentInstallmentId: groupId,
    });
  }

  return entries;
}

/**
 * Aplica a edição de uma parcela de cartão à lista inteira: a parcela editada é
 * substituída como veio e, se pertencer a um grupo parcelado, os campos
 * compartilhados (nome, valor, cartão, nº de parcelas, categoria e tag) são
 * propagados para as parcelas irmãs — preservando data/fatura/nº de cada uma.
 */
/**
 * Aplica a edição de uma parcela de lançamento (dívida/entrada) à lista inteira:
 * a parcela editada é substituída como veio e, se pertencer a um grupo parcelado
 * (parentInstallmentId), os campos compartilhados (nome, valor, tipo, nº de
 * parcelas, categoria e tag) são propagados para as parcelas irmãs — preservando
 * data/vencimento/status de pagamento/nº da parcela de cada uma.
 */
export function propagateEntryInstallmentUpdate(list: Entry[], updated: Entry): Entry[] {
  const groupId = updated.parentInstallmentId;
  return list.map((e) => {
    if (e.id === updated.id) return updated;
    if (groupId && e.parentInstallmentId === groupId) {
      return {
        ...e,
        name: updated.name,
        amount: updated.amount,
        type: updated.type,
        installmentsCount: updated.installmentsCount,
        category: updated.category,
        tag: updated.tag,
      };
    }
    return e;
  });
}

export function propagateInstallmentUpdate(
  list: CardExpense[],
  updated: CardExpense
): CardExpense[] {
  const groupId = updated.parentInstallmentId;
  return list.map((e) => {
    if (e.id === updated.id) return updated;
    if (groupId && e.parentInstallmentId === groupId) {
      return {
        ...e,
        name: updated.name,
        amount: updated.amount,
        cardId: updated.cardId,
        installmentsCount: updated.installmentsCount,
        category: updated.category,
        tag: updated.tag,
      };
    }
    return e;
  });
}
