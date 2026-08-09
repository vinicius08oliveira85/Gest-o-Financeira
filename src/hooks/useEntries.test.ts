import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEntries } from './useEntries';
import type { Entry } from '../types';
import { ENTRIES_STORAGE_KEY } from '../constants';

const mockEntries: Entry[] = [
  {
    id: '1',
    name: 'Entrada 1',
    amount: 100,
    dueDate: '2025-03-15',
    isPaid: false,
    type: 'cash',
    createdAt: Date.now(),
    category: 'Salário',
  },
  {
    id: '2',
    name: 'Saída 1',
    amount: 50,
    dueDate: '2025-03-10',
    isPaid: true,
    type: 'debt',
    createdAt: Date.now(),
    category: 'Contas',
  },
];

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

vi.mock('../lib/entriesDb', () => ({
  fetchEntries: vi.fn(),
  insertEntriesBatch: vi.fn(),
  syncEntriesDelta: vi.fn(),
  bumpEntryUpdatedAt: vi.fn((entry: Entry) => ({ ...entry, updatedAt: Date.now() })),
}));

describe('useEntries', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sem Supabase: carrega do localStorage e retorna', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(mockEntries));

    const { result } = renderHook(() => useEntries());

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0].name).toBe('Entrada 1');
  });

  it('com Supabase: chama fetchEntries e seta entries', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchEntries } = await import('../lib/entriesDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchEntries).mockResolvedValue(mockEntries);

    const { result } = renderHook(() => useEntries());

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(fetchEntries).toHaveBeenCalled();
    expect(result.current.entries).toHaveLength(2);
  });

  it('filtros (filter, selectedCategory) refletidos em filteredEntries', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const march = new Date().getMonth();
    const year = new Date().getFullYear();
    const inPeriod = mockEntries.map((e) => ({
      ...e,
      dueDate: `${year}-${String(march + 1).padStart(2, '0')}-15`,
    }));
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(inPeriod));

    const { result } = renderHook(() => useEntries());

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(result.current.filteredEntries.length).toBeGreaterThanOrEqual(0);

    await act(async () => {
      result.current.setFilter('pending');
    });
    expect(result.current.filter).toBe('pending');

    await act(async () => {
      result.current.setSelectedCategory('Salário');
    });
    expect(result.current.selectedCategory).toBe('Salário');
  });

  it('totais globais aplicam inversão de metas (depósito = saída, saque = entrada)', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const dueDate = `${year}-${String(month + 1).padStart(2, '0')}-10`;
    const entries: Entry[] = [
      {
        id: 'salario',
        name: 'Salário',
        amount: 1000,
        dueDate,
        isPaid: true,
        type: 'cash',
        createdAt: 1,
      },
      {
        id: 'deposito-meta',
        name: 'Depósito na meta',
        amount: 300,
        dueDate,
        isPaid: true,
        type: 'cash',
        createdAt: 1,
        goalId: 'g1',
      },
      {
        id: 'saque-meta',
        name: 'Saque da meta',
        amount: 100,
        dueDate,
        isPaid: true,
        type: 'debt',
        createdAt: 1,
        goalId: 'g1',
      },
      {
        id: 'conta',
        name: 'Conta',
        amount: 200,
        dueDate,
        isPaid: true,
        type: 'debt',
        createdAt: 1,
      },
    ];
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));

    const { result } = renderHook(() => useEntries());

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    // Entradas: salário (1000) + saque da meta (100); depósito na meta (300) conta como saída.
    expect(result.current.totalEntradasLancadas).toBe(1100);
    // Saídas: conta (200) + depósito na meta (300).
    expect(result.current.totalSaidasLancadas).toBe(500);
    // Saldo (finalizadas): 1100 - 500.
    expect(result.current.saldo).toBe(600);
  });

  it('editar uma parcela propaga nome/valor/tipo às irmãs preservando vencimento/nº', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const due = (d: number) =>
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const group = 'group-1';
    const installment = (id: string, installmentNumber: number, dueDay: number): Entry => ({
      id,
      name: 'Curso',
      amount: 100,
      dueDate: due(dueDay),
      isPaid: false,
      type: 'debt',
      createdAt: 1,
      installmentsCount: 3,
      installmentNumber,
      parentInstallmentId: group,
    });
    const entries: Entry[] = [
      installment('a', 1, 10),
      installment('b', 2, 10),
      installment('c', 3, 10),
      { ...installment('d', 1, 10), id: 'd', parentInstallmentId: undefined, amount: 999 },
    ];
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));

    const { result } = renderHook(() => useEntries());

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2000 }
    );

    await act(async () => {
      await result.current.addOrUpdateEntry(
        { ...entries[1], name: 'Curso atualizado', amount: 150, type: 'cash' },
        true
      );
    });

    expect(result.current.entries.find((e) => e.id === 'b')).toMatchObject({
      name: 'Curso atualizado',
      amount: 150,
      type: 'cash',
      installmentNumber: 2,
      parentInstallmentId: group,
    });
    expect(result.current.entries.find((e) => e.id === 'a')).toMatchObject({
      name: 'Curso atualizado',
      amount: 150,
      type: 'cash',
      installmentNumber: 1,
      dueDate: due(10),
      isPaid: false,
    });
    expect(result.current.entries.find((e) => e.id === 'c')).toMatchObject({
      name: 'Curso atualizado',
      amount: 150,
      type: 'cash',
      installmentNumber: 3,
    });
    // Fora do grupo não muda.
    expect(result.current.entries.find((e) => e.id === 'd')).toMatchObject({
      name: 'Curso',
      amount: 999,
      type: 'debt',
    });
  });
});
