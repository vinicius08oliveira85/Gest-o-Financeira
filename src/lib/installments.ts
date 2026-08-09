import type { CardExpense, Entry, EntryType } from '../types';
import { parseDateLocal } from './format';
import { copyDueDateForMonth } from './recurringEntries';
import { randomUUID } from './uuid';

type BaseInstallmentInput = {
  name: string;
  amountPerInstallment: number;
  firstDueDate: string;
  type: EntryType;
  category?: string;
  tag?: string;
  count: number;
};

export function generateInstallmentEntries(input: BaseInstallmentInput): Entry[] {
  const { name, amountPerInstallment, firstDueDate, type, category, tag, count } = input;

  const baseDate = parseDateLocal(firstDueDate);
  const createdAt = Date.now();
  const groupId = randomUUID();

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
      amount: amountPerInstallment,
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
