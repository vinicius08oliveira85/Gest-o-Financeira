import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCardExpenses } from './useCardExpenses';
import type { CardExpense } from '../types';
import { CARD_EXPENSES_STORAGE_KEY } from '../constants';

const baseExpense: Omit<CardExpense, 'id' | 'createdAt'> = {
  cardId: 'c1',
  name: 'Mercado',
  amount: 250,
  date: '2025-03-10',
  billingMonth: 3,
  billingYear: 2025,
};

const mockExpenses: CardExpense[] = [{ ...baseExpense, id: 'e1', createdAt: Date.now() }];

const cloudExpense: CardExpense = {
  ...baseExpense,
  id: 'cloud',
  name: 'Gasto Cloud',
  createdAt: 1,
};

const localExpense: CardExpense = {
  ...baseExpense,
  id: 'local',
  name: 'Gasto Local',
  createdAt: 2,
};

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

vi.mock('../lib/cardExpensesDb', () => ({
  fetchAllExpenses: vi.fn(),
  insertExpense: vi.fn(),
  upsertExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  deleteExpensesByCard: vi.fn(),
}));

function setStored(data: CardExpense[]) {
  localStorage.setItem(
    CARD_EXPENSES_STORAGE_KEY,
    JSON.stringify({ version: 1, data, updatedAt: Date.now() })
  );
}

describe('useCardExpenses', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sem Supabase: carrega do armazenamento local', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    setStored(mockExpenses);

    const { result } = renderHook(() => useCardExpenses());

    await waitFor(() => expect(result.current.isLoadingExpenses).toBe(false), { timeout: 2000 });

    expect(result.current.expenses).toHaveLength(1);
    expect(result.current.expenses[0].name).toBe('Mercado');
  });

  it('com Supabase: chama fetchAllExpenses e seta expenses', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchAllExpenses } = await import('../lib/cardExpensesDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchAllExpenses).mockResolvedValue(mockExpenses);

    const { result } = renderHook(() => useCardExpenses());

    await waitFor(() => expect(result.current.isLoadingExpenses).toBe(false), { timeout: 2000 });

    expect(fetchAllExpenses).toHaveBeenCalled();
    expect(result.current.expenses).toHaveLength(1);
  });

  it('não sobrescreve o backup local com [] durante o hydrate na nuvem', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchAllExpenses } = await import('../lib/cardExpensesDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchAllExpenses).mockResolvedValue(mockExpenses);
    setStored(mockExpenses);

    const { result } = renderHook(() => useCardExpenses());

    await waitFor(() => expect(result.current.isLoadingExpenses).toBe(false), { timeout: 2000 });

    const raw = localStorage.getItem(CARD_EXPENSES_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).data).toHaveLength(1);
  });

  it('com Supabase: reenvia gastos locais quando a nuvem volta vazia', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchAllExpenses, upsertExpense } = await import('../lib/cardExpensesDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchAllExpenses).mockResolvedValueOnce([]).mockResolvedValue([localExpense]);
    vi.mocked(upsertExpense).mockImplementation(async (e) => ({ ...e, id: e.id as string }));
    setStored([localExpense]);

    const { result } = renderHook(() => useCardExpenses());

    await waitFor(() => expect(result.current.isLoadingExpenses).toBe(false), { timeout: 2000 });

    // O id local precisa ser preservado: insertExpense geraria um id novo e duplicaria o gasto.
    expect(upsertExpense).toHaveBeenCalledWith(expect.objectContaining({ id: 'local' }));
    expect(result.current.expenses).toHaveLength(1);
    expect(result.current.expenses[0].id).toBe('local');
  });

  it('com Supabase: migra gastos locais ausentes de uma resposta não vazia', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchAllExpenses, upsertExpense } = await import('../lib/cardExpensesDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchAllExpenses)
      .mockResolvedValueOnce([cloudExpense])
      .mockResolvedValue([cloudExpense, localExpense]);
    vi.mocked(upsertExpense).mockImplementation(async (e) => ({ ...e, id: e.id as string }));
    setStored([cloudExpense, localExpense]);

    const { result } = renderHook(() => useCardExpenses());

    await waitFor(() => expect(result.current.isLoadingExpenses).toBe(false), { timeout: 2000 });

    expect(upsertExpense).toHaveBeenCalledWith(expect.objectContaining({ id: 'local' }));
    expect(result.current.expenses.map((e) => e.id)).toEqual(
      expect.arrayContaining(['cloud', 'local'])
    );
  });

  it('com Supabase: mantém gasto local visível quando o upsert falha', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchAllExpenses, upsertExpense } = await import('../lib/cardExpensesDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchAllExpenses).mockResolvedValue([cloudExpense]);
    vi.mocked(upsertExpense).mockRejectedValue(new Error('offline'));
    setStored([cloudExpense, localExpense]);

    const { result } = renderHook(() => useCardExpenses());

    await waitFor(() => expect(result.current.isLoadingExpenses).toBe(false), { timeout: 2000 });

    expect(result.current.expenses.map((e) => e.id)).toEqual(
      expect.arrayContaining(['cloud', 'local'])
    );
    const raw = localStorage.getItem(CARD_EXPENSES_STORAGE_KEY);
    expect(JSON.parse(raw as string).data).toHaveLength(2);
  });
});
