import type { Entry, EntryType } from '../types';

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
  const {
    name,
    amountPerInstallment,
    firstDueDate,
    type,
    category,
    tag,
    count,
  } = input;

  const baseDate = new Date(firstDueDate);
  const createdAt = Date.now();
  const groupId = crypto.randomUUID();

  const entries: Entry[] = [];

  for (let i = 0; i < count; i++) {
    const due = new Date(baseDate);
    due.setMonth(baseDate.getMonth() + i);

    const id = i === 0 ? groupId : crypto.randomUUID();

    entries.push({
      id,
      name,
      amount: amountPerInstallment,
      dueDate: due.toISOString().slice(0, 10),
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

