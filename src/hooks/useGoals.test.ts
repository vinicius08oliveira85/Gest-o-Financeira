import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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
