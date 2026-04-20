import type { Entry, EntryType } from '../types';
import { parseDateLocal } from './format';

function copyDueDateForMonth(baseDueDate: string, targetMonth: number, targetYear: number): string {
  const base = parseDateLocal(baseDueDate);
  const day = base.getDate();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  const d = new Date(targetYear, targetMonth, safeDay);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

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
  const groupId = crypto.randomUUID();

  const entries: Entry[] = [];

  for (let i = 0; i < count; i++) {
    const targetMonth = baseDate.getMonth() + i;
    const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const dueDate = copyDueDateForMonth(firstDueDate, normalizedMonth, targetYear);

    const id = i === 0 ? groupId : crypto.randomUUID();

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
