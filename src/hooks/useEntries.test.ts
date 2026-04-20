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
});
