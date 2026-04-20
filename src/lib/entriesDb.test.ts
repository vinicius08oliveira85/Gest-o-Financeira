import { describe, it, expect } from 'vitest';
import { rowToEntry, entryToRow } from './entriesDb';
import type { Entry } from '../types';

describe('rowToEntry', () => {
  it('converte EntryRow para Entry com todos os campos', () => {
    const row = {
      id: 'abc-123',
      name: 'Salário',
      amount: 5000,
      due_date: '2025-03-15',
      is_paid: true,
      type: 'cash',
      created_at: '2025-03-01T10:00:00.000Z',
      category: 'Renda',
      tag: 'Empresa X',
      installments_count: null,
      installment_number: null,
      parent_installment_id: null,
      paid_date: '2025-03-15',
    };
    const entry = rowToEntry(row);
    expect(entry.id).toBe('abc-123');
    expect(entry.name).toBe('Salário');
    expect(entry.amount).toBe(5000);
    expect(entry.dueDate).toBe('2025-03-15');
    expect(entry.isPaid).toBe(true);
    expect(entry.type).toBe('cash');
    expect(entry.createdAt).toBe(new Date('2025-03-01T10:00:00.000Z').getTime());
    expect(entry.updatedAt).toBe(new Date('2025-03-01T10:00:00.000Z').getTime());
    expect(entry.revision).toBe(0);
    expect(entry.category).toBe('Renda');
    expect(entry.tag).toBe('Empresa X');
    expect(entry.installmentsCount).toBeUndefined();
    expect(entry.installmentNumber).toBeUndefined();
    expect(entry.parentInstallmentId).toBeUndefined();
    expect(entry.paidDate).toBe('2025-03-15');
  });

  it('mapeia paid_date null para paidDate undefined', () => {
    const row = {
      id: 'y',
      name: 'Y',
      amount: 10,
      due_date: '2025-01-01',
      is_paid: false,
      type: 'debt',
      created_at: '2025-01-01T00:00:00.000Z',
      paid_date: null,
    };
    const entry = rowToEntry(row);
    expect(entry.paidDate).toBeUndefined();
  });

  it('converte null/undefined em categoria e tag para undefined', () => {
    const row = {
      id: 'x',
      name: 'X',
      amount: 0,
      due_date: '2025-01-01',
      is_paid: false,
      type: 'debt',
      created_at: '2025-01-01T00:00:00.000Z',
      category: null,
      tag: null,
    };
    const entry = rowToEntry(row);
    expect(entry.category).toBeUndefined();
    expect(entry.tag).toBeUndefined();
  });

  it('mapeia revision numérico do servidor', () => {
    const row = {
      id: 'r1',
      name: 'X',
      amount: 1,
      due_date: '2025-01-01',
      is_paid: false,
      type: 'debt',
      created_at: '2025-01-01T00:00:00.000Z',
      revision: 7,
    };
    const entry = rowToEntry(row);
    expect(entry.revision).toBe(7);
  });

  it('converte parcelas quando preenchidas', () => {
    const row = {
      id: 'p1',
      name: 'Parcela',
      amount: 100,
      due_date: '2025-02-10',
      is_paid: false,
      type: 'debt',
      created_at: '2025-01-01T00:00:00.000Z',
      installments_count: 3,
      installment_number: 1,
      parent_installment_id: 'parent-id',
    };
    const entry = rowToEntry(row);
    expect(entry.installmentsCount).toBe(3);
    expect(entry.installmentNumber).toBe(1);
    expect(entry.parentInstallmentId).toBe('parent-id');
  });
});

describe('entryToRow', () => {
  it('converte Entry para row (sem id e created_at)', () => {
    const entry: Entry = {
      id: 'ignored',
      name: 'Aluguel',
      amount: 1200,
      dueDate: '2025-03-20',
      isPaid: false,
      type: 'debt',
      createdAt: 1234567890,
      category: 'Moradia',
      tag: 'Imobiliária',
    };
    const row = entryToRow(entry);
    expect(row).not.toHaveProperty('id');
    expect(row).not.toHaveProperty('created_at');
    expect(row.updated_at).toBe(new Date(1234567890).toISOString());
    expect(row.revision).toBe(0);
    expect(row.name).toBe('Aluguel');
    expect(row.amount).toBe(1200);
    expect(row.due_date).toBe('2025-03-20');
    expect(row.is_paid).toBe(false);
    expect(row.type).toBe('debt');
    expect(row.category).toBe('Moradia');
    expect(row.tag).toBe('Imobiliária');
  });

  it('inclui paid_date quando paidDate está preenchido', () => {
    const entry: Entry = {
      id: 'z',
      name: 'Z',
      amount: 50,
      dueDate: '2025-05-01',
      isPaid: true,
      type: 'debt',
      createdAt: 0,
      paidDate: '2025-05-02',
    };
    const row = entryToRow(entry);
    expect(row.paid_date).toBe('2025-05-02');
  });

  it('converte undefined em category/tag para null', () => {
    const entry: Entry = {
      id: 'x',
      name: 'X',
      amount: 0,
      dueDate: '2025-01-01',
      isPaid: false,
      type: 'cash',
      createdAt: 0,
    };
    const row = entryToRow(entry);
    expect(row.category).toBeNull();
    expect(row.tag).toBeNull();
  });
});

describe('rowToEntry e entryToRow idempotência', () => {
  it('entry -> row -> entry preserva dados (exceto id e createdAt)', () => {
    const entry: Entry = {
      id: 'original-id',
      name: 'Teste',
      amount: 99.5,
      dueDate: '2025-06-15',
      isPaid: true,
      type: 'cash',
      createdAt: 999,
      category: 'Cat',
      tag: 'Tag',
      installmentsCount: 2,
      installmentNumber: 1,
      parentInstallmentId: 'parent',
    };
    const row = entryToRow(entry);
    const reconstructed = rowToEntry({
      ...row,
      id: 'reconstructed-id',
      created_at: '2025-06-01T12:00:00.000Z',
    });
    expect(reconstructed.name).toBe(entry.name);
    expect(reconstructed.amount).toBe(entry.amount);
    expect(reconstructed.dueDate).toBe(entry.dueDate);
    expect(reconstructed.isPaid).toBe(entry.isPaid);
    expect(reconstructed.type).toBe(entry.type);
    expect(reconstructed.category).toBe(entry.category);
    expect(reconstructed.tag).toBe(entry.tag);
    expect(reconstructed.installmentsCount).toBe(entry.installmentsCount);
    expect(reconstructed.installmentNumber).toBe(entry.installmentNumber);
    expect(reconstructed.parentInstallmentId).toBe(entry.parentInstallmentId);
  });
});
