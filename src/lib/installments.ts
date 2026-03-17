import type { Entry, EntryType } from '../types';

function copyDueDateForMonth(baseDueDate: string, targetMonth: number, targetYear: number): string {
  const base = new Date(baseDueDate);
  const day = base.getDate();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  const d = new Date(targetYear, targetMonth, safeDay);
  return d.toISOString().slice(0, 10);
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

  const baseDate = new Date(firstDueDate);
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
      category: category || undefined,
      tag: tag || undefined,
      installmentsCount: count,
      installmentNumber: i + 1,
      parentInstallmentId: groupId,
    });
  }

  return entries;
}
