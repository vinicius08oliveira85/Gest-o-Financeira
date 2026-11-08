import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();

vi.mock('./supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import { deleteGoal } from './goalsDb';

describe('deleteGoal (goalsDb)', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('chama a RPC delete_goal_with_entries com o id da meta', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await deleteGoal('goal-1');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('delete_goal_with_entries', { p_goal_id: 'goal-1' });
  });

  it('propaga o erro do banco para que a tela não remova a meta', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('permission denied') });

    await expect(deleteGoal('goal-1')).rejects.toThrow('permission denied');
  });
});
