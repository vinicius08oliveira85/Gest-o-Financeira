import { describe, it, expect } from 'vitest';
import type { Entry } from '../types';
import { generateMissingRecurringCopies, recurringSlotKey } from './recurringEntries';

describe('recurringSlotKey', () => {
  it('combina template e mês/ano da data', () => {
    expect(recurringSlotKey('tmpl-1', '2025-06-15')).toBe('tmpl-1|2025-06');
  });
});

describe('generateMissingRecurringCopies', () => {
  const model: Entry = {
    id: 'model-1',
    name: 'Aluguel',
    amount: 1000,
    dueDate: '2025-01-10',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    isRecurring: true,
    recurrenceCount: 3,
  };

  it('não gera cópia para mês suprimido', () => {
    const febDue = '2025-02-10';
    const suppressed = new Set([recurringSlotKey('model-1', febDue)]);
    const copies = generateMissingRecurringCopies([model], suppressed);
    const febCopy = copies.find((c) => c.dueDate === febDue);
    expect(febCopy).toBeUndefined();
    expect(copies.length).toBeGreaterThanOrEqual(0);
  });
});
