import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGoals } from './useGoals';
import type { Goal } from '../types';
import { GOALS_STORAGE_KEY } from '../constants';

const mockGoals: Goal[] = [
  {
    id: 'g1',
    name: 'Reserva de emergência',
    targetAmount: 10000,
    currentAmount: 3000,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
}));

vi.mock('../lib/goalsDb', () => ({
  fetchGoals: vi.fn(),
  upsertGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

describe('useGoals', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sem Supabase: carrega do localStorage e retorna goals', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(mockGoals));

    const { result } = renderHook(() => useGoals());

    await waitFor(
      () => {
        expect(result.current.isLoadingGoals).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].name).toBe('Reserva de emergência');
  });

  it('com Supabase: chama fetchGoals e seta goals', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchGoals } = await import('../lib/goalsDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchGoals).mockResolvedValue(mockGoals);

    const { result } = renderHook(() => useGoals());

    await waitFor(
      () => {
        expect(result.current.isLoadingGoals).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(fetchGoals).toHaveBeenCalled();
    expect(result.current.goals).toHaveLength(1);
  });

  it('não sobrescreve o backup local com [] durante o hydrate na nuvem', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchGoals } = await import('../lib/goalsDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchGoals).mockResolvedValue(mockGoals);
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({ version: 1, data: mockGoals, updatedAt: Date.now() })
    );

    const { result } = renderHook(() => useGoals());

    await waitFor(() => expect(result.current.isLoadingGoals).toBe(false), { timeout: 2000 });

    // O espelho local nunca pode ficar vazio: foi esse [] inicial que apagava as metas.
    expect(result.current.goals).toHaveLength(1);
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).data).toHaveLength(1);
  });

  it('com Supabase: migra metas locais ausentes da resposta da nuvem', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchGoals, upsertGoal } = await import('../lib/goalsDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    const cloudGoal: Goal = {
      id: 'cloud',
      name: 'Meta na nuvem',
      targetAmount: 1,
      currentAmount: 0,
    };
    const localGoal: Goal = { id: 'local', name: 'Meta local', targetAmount: 2, currentAmount: 0 };
    vi.mocked(fetchGoals)
      .mockResolvedValueOnce([cloudGoal])
      .mockResolvedValue([cloudGoal, localGoal]);
    vi.mocked(upsertGoal).mockImplementation(async (g) => ({ ...g, id: g.id as string }));
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({ version: 1, data: [cloudGoal, localGoal], updatedAt: Date.now() })
    );

    const { result } = renderHook(() => useGoals());

    await waitFor(() => expect(result.current.isLoadingGoals).toBe(false), { timeout: 2000 });

    expect(upsertGoal).toHaveBeenCalledWith(expect.objectContaining({ id: 'local' }));
    expect(result.current.goals.map((g) => g.id)).toEqual(
      expect.arrayContaining(['cloud', 'local'])
    );
  });

  it('com Supabase: mantém meta local visível quando o upsert falha', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchGoals, upsertGoal } = await import('../lib/goalsDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    const cloudGoal: Goal = {
      id: 'cloud',
      name: 'Meta na nuvem',
      targetAmount: 1,
      currentAmount: 0,
    };
    const localGoal: Goal = { id: 'local', name: 'Meta local', targetAmount: 2, currentAmount: 0 };
    vi.mocked(fetchGoals).mockResolvedValue([cloudGoal]);
    vi.mocked(upsertGoal).mockRejectedValue(new Error('offline'));
    localStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify({ version: 1, data: [cloudGoal, localGoal], updatedAt: Date.now() })
    );

    const { result } = renderHook(() => useGoals());

    await waitFor(() => expect(result.current.isLoadingGoals).toBe(false), { timeout: 2000 });

    expect(result.current.goals.map((g) => g.id)).toEqual(
      expect.arrayContaining(['cloud', 'local'])
    );
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    expect(JSON.parse(raw as string).data).toHaveLength(2);
  });

  it('com Supabase e localStorage com dados: carrega e chama fetchGoals', async () => {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    const { fetchGoals } = await import('../lib/goalsDb');
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(fetchGoals).mockResolvedValue(mockGoals);

    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(mockGoals));

    const { result } = renderHook(() => useGoals());

    await waitFor(
      () => {
        expect(result.current.isLoadingGoals).toBe(false);
      },
      { timeout: 2000 }
    );

    expect(fetchGoals).toHaveBeenCalled();
    expect(result.current.goals).toHaveLength(1);
  });
});
