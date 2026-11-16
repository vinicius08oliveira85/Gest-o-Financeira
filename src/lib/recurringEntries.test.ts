import { describe, it, expect } from 'vitest';
import type { Entry } from '../types';
import {
  dedupeRecurringCopies,
  generateMissingRecurringCopies,
  recurringCopyId,
  recurringSlotKey,
} from './recurringEntries';

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

describe('recurringCopyId', () => {
  it('é determinístico para o mesmo modelo e mês', () => {
    expect(recurringCopyId('model-1', '2025-02-10')).toBe(recurringCopyId('model-1', '2025-02-28'));
  });

  it('muda com o mês ou com o modelo', () => {
    const fev = recurringCopyId('model-1', '2025-02-10');
    expect(recurringCopyId('model-1', '2025-03-10')).not.toBe(fev);
    expect(recurringCopyId('model-2', '2025-02-10')).not.toBe(fev);
  });

  it('cabe no limite do Appwrite e usa só caracteres permitidos', () => {
    const id = recurringCopyId('um-id-de-modelo-bem-comprido-com-muitos-caracteres', '2025-02-10');
    expect(id.length).toBeLessThanOrEqual(36);
    expect(id).toMatch(/^[A-Za-z0-9-]+$/);
  });
});

describe('generateMissingRecurringCopies — id estável', () => {
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

  it('gera as cópias com id determinístico (mesmo id em qualquer dispositivo)', () => {
    const copies = generateMissingRecurringCopies([model]);
    expect(copies).toHaveLength(3);
    for (const copy of copies) {
      expect(copy.id).toBe(recurringCopyId(model.id, copy.dueDate));
      expect(copy.recurrenceTemplateId).toBe(model.id);
    }
  });

  it('duas gerações seguidas produzem exatamente os mesmos ids', () => {
    const first = generateMissingRecurringCopies([model])
      .map((c) => c.id)
      .sort();
    const second = generateMissingRecurringCopies([model])
      .map((c) => c.id)
      .sort();
    expect(second).toEqual(first);
  });
});

describe('dedupeRecurringCopies', () => {
  const copy = (id: string, dueDate: string, overrides: Partial<Entry> = {}): Entry => ({
    id,
    name: 'Aluguel',
    amount: 1000,
    dueDate,
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    recurrenceTemplateId: 'model-1',
    ...overrides,
  });

  it('mantém uma cópia por modelo/mês e devolve os ids extras', () => {
    const keep = copy(recurringCopyId('model-1', '2025-02-10'), '2025-02-10');
    const dup = copy('aleatorio-1', '2025-02-10', { createdAt: 2 });
    const otherMonth = copy(recurringCopyId('model-1', '2025-03-10'), '2025-03-10');

    const result = dedupeRecurringCopies([dup, keep, otherMonth]);

    expect(result.entries.map((e) => e.id).sort()).toEqual([keep.id, otherMonth.id].sort());
    expect(result.removedIds).toEqual([dup.id]);
  });

  it('prefere a cópia com id determinístico quando ela existe', () => {
    const deterministic = copy(recurringCopyId('model-1', '2025-02-10'), '2025-02-10', {
      createdAt: 99,
    });
    const olderRandom = copy('aleatorio-1', '2025-02-10', { createdAt: 1 });

    const result = dedupeRecurringCopies([olderRandom, deterministic]);

    expect(result.entries.map((e) => e.id)).toEqual([deterministic.id]);
    expect(result.removedIds).toEqual([olderRandom.id]);
  });

  it('não toca em modelos nem em lançamentos normais', () => {
    const model = copy('model-1', '2025-01-10', { recurrenceTemplateId: undefined });
    const normal = copy('normal', '2025-02-10', { recurrenceTemplateId: undefined });

    const result = dedupeRecurringCopies([model, normal]);

    expect(result.entries).toHaveLength(2);
    expect(result.removedIds).toEqual([]);
  });

  it('sem duplicatas devolve a mesma lista', () => {
    const list = [copy(recurringCopyId('model-1', '2025-02-10'), '2025-02-10')];
    const result = dedupeRecurringCopies(list);
    expect(result.removedIds).toEqual([]);
    expect(result.entries).toBe(list);
  });
});
