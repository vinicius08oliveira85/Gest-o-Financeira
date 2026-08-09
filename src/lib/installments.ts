import type { Entry, EntryType } from '../types';
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
